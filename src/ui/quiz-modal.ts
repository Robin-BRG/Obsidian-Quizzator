import { App, Modal, Notice } from 'obsidian';
import { Quiz, calculateQuizResult } from '../models/quiz';
import { Question, QuestionResult, MCQQuestion, SliderQuestion } from '../models/question';
import { LLMProvider } from '../llm/llm-provider';
import { evaluateAnswer } from '../utils/scoring';

export class QuizModal extends Modal {
    private quiz: Quiz;
    private llmProvider: LLMProvider;
    private language: string;
    private currentQuestionIndex: number = 0;
    private questionResults: QuestionResult[] = [];
    private currentAnswer: string | string[] | number | boolean | null = null;
    private isEvaluating: boolean = false;
    private showDetails: boolean = false;

    // DOM elements
    private headerEl: HTMLElement;
    private mainContentEl: HTMLElement;
    private footerEl: HTMLElement;

    constructor(app: App, quiz: Quiz, llmProvider: LLMProvider, language: string = 'Français') {
        super(app);
        this.quiz = quiz;
        this.llmProvider = llmProvider;
        this.language = language;
    }

    onOpen() {
        const {contentEl, modalEl} = this;

        // Apply fixed size to the modal itself
        modalEl.addClass('quizzator-modal');

        // Remove default title (we'll use our own header)
        this.titleEl.addClass('quizzator-hidden');

        // Structure: Header | Content | Footer
        this.headerEl = contentEl.createDiv({ cls: 'quizzator-header' });
        this.mainContentEl = contentEl.createDiv({ cls: 'quizzator-content' });
        this.footerEl = contentEl.createDiv({ cls: 'quizzator-footer' });

        this.showQuestion();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }

    private showQuestion() {
        this.currentAnswer = null;
        this.showDetails = false;

        // Progress bar
        this.renderProgressBar();

        // Question
        const question = this.quiz.questions[this.currentQuestionIndex];
        this.renderQuestion(question);

        // Buttons
        this.renderButtons();
    }

    private renderProgressBar() {
        this.headerEl.empty();
        const question = this.quiz.questions[this.currentQuestionIndex];

        // Top row: Question counter + badges
        const topRow = this.headerEl.createDiv({ cls: 'quizzator-header-row' });

        topRow.createSpan({
            cls: 'quizzator-progress-text',
            text: `Question ${this.currentQuestionIndex + 1}/${this.quiz.questions.length}`
        });

        // Type badge
        const typeLabels: Record<string, string> = {
            'free-text': 'Réponse libre',
            'mcq': 'QCM',
            'slider': 'Curseur',
            'true-false': 'Vrai / Faux'
        };
        topRow.createSpan({
            cls: 'quizzator-question-type-badge',
            text: typeLabels[question.type] || question.type
        });

        // Weight badge (if > 1)
        if (question.weight > 1) {
            topRow.createSpan({
                cls: 'quizzator-question-weight',
                text: `×${question.weight}`
            });
        }

        // Progress bar
        const bar = this.headerEl.createDiv({ cls: 'quizzator-progress-bar' });
        const fill = bar.createDiv({ cls: 'quizzator-progress-fill' });
        const progress = ((this.currentQuestionIndex + 1) / this.quiz.questions.length) * 100;
        fill.setCssProps({ '--progress-width': `${progress}%` });
    }

    private renderQuestion(question: Question) {
        this.mainContentEl.empty();

        // Question text
        const questionText = this.mainContentEl.createDiv({ cls: 'quizzator-question-text' });
        questionText.setText(question.q);

        // Answer area
        const answerArea = this.mainContentEl.createDiv({ cls: 'quizzator-answer-area' });

        switch (question.type) {
            case 'free-text':
                this.renderFreeText(answerArea);
                break;
            case 'mcq':
                this.renderMCQ(answerArea, question);
                break;
            case 'slider':
                this.renderSlider(answerArea, question);
                break;
            case 'true-false':
                this.renderTrueFalse(answerArea);
                break;
        }
    }

    private renderFreeText(container: HTMLElement) {
        const textarea = container.createEl('textarea', {
            cls: 'quizzator-free-text',
            attr: {
                placeholder: 'Tapez votre réponse ici...',
                autofocus: 'true'
            }
        });

        textarea.addEventListener('input', () => {
            this.currentAnswer = textarea.value.trim();
        });

        // Focus after render
        setTimeout(() => textarea.focus(), 100);
    }

    private renderMCQ(container: HTMLElement, question: MCQQuestion) {
        const options = container.createDiv({ cls: 'quizzator-mcq-options' });
        this.currentAnswer = [];

        question.options.forEach((option: string, index: number) => {
            const optionDiv = options.createDiv({ cls: 'quizzator-mcq-option' });

            const input = optionDiv.createEl('input', {
                type: question.multiple ? 'checkbox' : 'radio',
                attr: {
                    name: 'mcq',
                    value: option,
                    id: `opt-${index}`
                }
            });

            const labelEl = optionDiv.createEl('label', {
                text: option,
                attr: { for: `opt-${index}` }
            });

            const updateAnswer = () => {
                if (question.multiple) {
                    const checked = options.querySelectorAll<HTMLInputElement>('input:checked');
                    this.currentAnswer = Array.from(checked).map(cb => cb.value);

                    // Update visual for ALL options based on their checked state
                    options.querySelectorAll('.quizzator-mcq-option').forEach(div => {
                        const inp = div.querySelector<HTMLInputElement>('input');
                        if (inp?.checked) {
                            div.addClass('selected');
                        } else {
                            div.removeClass('selected');
                        }
                    });
                } else {
                    this.currentAnswer = [option];
                    options.querySelectorAll('.quizzator-mcq-option').forEach(div => {
                        div.removeClass('selected');
                    });
                    optionDiv.addClass('selected');
                }
            };

            input.addEventListener('change', updateAnswer);
            optionDiv.addEventListener('click', (e) => {
                if (e.target !== input && e.target !== labelEl) {
                    input.checked = !input.checked;
                    if (!question.multiple) {
                        options.querySelectorAll<HTMLInputElement>('input').forEach(inp => {
                            if (inp !== input) inp.checked = false;
                        });
                    }
                    updateAnswer();
                }
            });
        });
    }

    private renderSlider(container: HTMLElement, question: SliderQuestion) {
        const sliderDiv = container.createDiv({ cls: 'quizzator-slider-container' });

        const initialValue = Math.floor((question.min + question.max) / 2);
        this.currentAnswer = initialValue;

        const valueDisplay = sliderDiv.createDiv({
            cls: 'quizzator-slider-value',
            text: String(initialValue)
        });

        // Wrapper to keep slider and labels aligned
        const wrapper = sliderDiv.createDiv({ cls: 'quizzator-slider-wrapper' });

        const slider = wrapper.createEl('input', {
            type: 'range',
            cls: 'quizzator-slider',
            attr: {
                min: String(question.min),
                max: String(question.max),
                step: String(question.step || 1),
                value: String(initialValue)
            }
        });

        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueDisplay.setText(String(value));
            this.currentAnswer = value;
        });

        const labels = wrapper.createDiv({ cls: 'quizzator-slider-labels' });
        labels.createSpan({ text: String(question.min) });
        labels.createSpan({ text: String(question.max) });
    }

    private renderTrueFalse(container: HTMLElement) {
        const tfDiv = container.createDiv({ cls: 'quizzator-true-false' });

        const trueBtn = tfDiv.createDiv({
            cls: 'quizzator-tf-button true',
            text: 'VRAI'
        });

        const falseBtn = tfDiv.createDiv({
            cls: 'quizzator-tf-button false',
            text: 'FAUX'
        });

        trueBtn.addEventListener('click', () => {
            this.currentAnswer = true;
            trueBtn.addClass('selected');
            falseBtn.removeClass('selected');
        });

        falseBtn.addEventListener('click', () => {
            this.currentAnswer = false;
            falseBtn.addClass('selected');
            trueBtn.removeClass('selected');
        });
    }

    private renderButtons() {
        this.footerEl.empty();
        const buttons = this.footerEl.createDiv({ cls: 'quizzator-buttons' });

        if (this.currentQuestionIndex > 0) {
            const backBtn = buttons.createEl('button', {
                cls: 'quizzator-button quizzator-button-secondary',
                text: 'Précédent'
            });
            backBtn.addEventListener('click', () => {
                this.currentQuestionIndex--;
                this.showQuestion();
            });
        }

        const nextBtn = buttons.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: this.currentQuestionIndex === this.quiz.questions.length - 1 ? 'Terminer' : 'Suivant'
        });

        nextBtn.addEventListener('click', () => { void this.handleNext(); });
    }

    private async handleNext() {
        if (this.currentAnswer === null ||
            (Array.isArray(this.currentAnswer) && this.currentAnswer.length === 0)) {
            new Notice('Veuillez donner une réponse');
            return;
        }

        if (this.isEvaluating) return;

        this.isEvaluating = true;
        this.showLoading();

        try {
            const question = this.quiz.questions[this.currentQuestionIndex];
            const result = await evaluateAnswer(
                question,
                this.currentAnswer,
                this.quiz.scoring,
                this.llmProvider,
                this.language
            );

            this.questionResults[this.currentQuestionIndex] = result;
            this.showQuestionResult(result);
        } catch (error) {
            new Notice(`Erreur: ${(error as Error).message}`);
            this.isEvaluating = false;
            this.showQuestion();
        }
    }

    private showLoading() {
        this.mainContentEl.empty();
        const loading = this.mainContentEl.createDiv({ cls: 'quizzator-loading' });
        loading.createDiv({ cls: 'quizzator-loading-spinner' });
        loading.createDiv({
            cls: 'quizzator-loading-text',
            text: 'Évaluation en cours...'
        });
    }

    private showQuestionResult(result: QuestionResult) {
        this.headerEl.empty();
        this.mainContentEl.empty();
        this.footerEl.empty();

        // Header simple
        const header = this.headerEl.createDiv({ cls: 'quizzator-progress-text' });
        header.setText(`Question ${this.currentQuestionIndex + 1}/${this.quiz.questions.length}`);

        // Result display - COMPACT
        const resultDiv = this.mainContentEl.createDiv({ cls: `quizzator-result ${result.status}` });

        // Icon
        const icon = resultDiv.createDiv({ cls: 'quizzator-result-icon' });
        icon.setText(result.status === 'passed' ? '✓' : result.status === 'imprecise' ? '~' : '✗');

        // Score
        resultDiv.createDiv({
            cls: 'quizzator-result-score',
            text: `${result.score}/100`
        });

        // Status
        const statusText = result.status === 'passed' ? 'Correct' :
                          result.status === 'imprecise' ? 'Imprécis' : 'Incorrect';
        resultDiv.createDiv({
            cls: 'quizzator-result-status',
            text: statusText
        });

        // Toggle button for details
        const toggleBtn = resultDiv.createEl('button', {
            cls: 'quizzator-result-toggle',
            text: 'Voir les détails'
        });

        const detailsDiv = resultDiv.createDiv({ cls: 'quizzator-result-details quizzator-hidden' });

        toggleBtn.addEventListener('click', () => {
            this.showDetails = !this.showDetails;
            detailsDiv.toggleClass('quizzator-hidden', !this.showDetails);
            toggleBtn.setText(this.showDetails ? 'Masquer les détails' : 'Voir les détails');
        });

        // Details (hidden by default)
        if (result.explanation) {
            detailsDiv.createEl('p', { text: result.explanation });
        }
        if (result.expectedAnswer) {
            const expected = detailsDiv.createEl('p');
            expected.createEl('strong', { text: 'Réponse attendue : ' });
            expected.appendText(result.expectedAnswer);
        }

        // Continue button
        const buttons = this.footerEl.createDiv({ cls: 'quizzator-buttons' });
        const continueBtn = buttons.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: this.currentQuestionIndex === this.quiz.questions.length - 1 ? 'Voir résultats' : 'Continuer'
        });

        continueBtn.addEventListener('click', () => {
            this.isEvaluating = false;
            this.currentAnswer = null;

            if (this.currentQuestionIndex === this.quiz.questions.length - 1) {
                this.showFinalResults();
            } else {
                this.currentQuestionIndex++;
                this.showQuestion();
            }
        });
    }

    private showFinalResults() {
        this.headerEl.empty();
        this.mainContentEl.empty();
        this.footerEl.empty();

        const quizResult = calculateQuizResult(this.quiz, this.questionResults);

        const results = this.mainContentEl.createDiv({ cls: 'quizzator-final-results' });

        const header = results.createDiv({ cls: 'quizzator-final-header' });
        header.createDiv({
            cls: 'quizzator-final-title',
            text: 'Résultats'
        });

        header.createDiv({
            cls: `quizzator-final-score ${quizResult.status}`,
            text: `${Math.round(quizResult.totalScore)}/100`
        });

        const statusText = quizResult.status === 'passed' ? 'Réussi' :
                          quizResult.status === 'imprecise' ? 'Imprécis' : 'Échoué';
        header.createDiv({
            cls: 'quizzator-final-status',
            text: statusText
        });

        results.createDiv({ cls: 'quizzator-details-heading', text: 'Détails par question' });

        this.questionResults.forEach((r, i) => {
            const questionContainer = results.createDiv({ cls: 'quizzator-question-detail-container' });

            const summary = questionContainer.createDiv({ cls: 'quizzator-question-summary' });

            const statusIcon = r.status === 'passed' ? '✓' : r.status === 'imprecise' ? '~' : '✗';
            summary.createDiv({
                cls: 'quizzator-question-summary-text',
                text: `${statusIcon} Question ${i + 1}`
            });

            summary.createDiv({
                cls: 'quizzator-question-summary-score',
                text: `${r.score}/100`
            });

            // Expandable details
            const details = questionContainer.createDiv({ cls: 'quizzator-question-detail-panel quizzator-hidden' });

            // Question text
            details.createEl('p', {
                cls: 'quizzator-detail-question',
                text: r.question.q
            });

            // User answer
            const userAnswerEl = details.createEl('p');
            userAnswerEl.createEl('strong', { text: 'Votre réponse : ' });
            const userAnswerText = Array.isArray(r.userAnswer)
                ? r.userAnswer.join(', ')
                : String(r.userAnswer);
            userAnswerEl.appendText(userAnswerText);

            // Expected answer
            if (r.expectedAnswer) {
                const expectedEl = details.createEl('p');
                expectedEl.createEl('strong', { text: 'Réponse attendue : ' });
                expectedEl.appendText(r.expectedAnswer);
            }

            // Explanation
            if (r.explanation) {
                details.createEl('p', {
                    cls: 'quizzator-detail-explanation',
                    text: r.explanation
                });
            }

            // Toggle on click
            summary.addEventListener('click', () => {
                const isExpanded = !details.hasClass('quizzator-hidden');
                details.toggleClass('quizzator-hidden', isExpanded);
                summary.toggleClass('expanded', !isExpanded);
            });
        });

        const buttons = this.footerEl.createDiv({ cls: 'quizzator-buttons' });
        buttons.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: 'Fermer'
        }).addEventListener('click', () => this.close());
    }
}
