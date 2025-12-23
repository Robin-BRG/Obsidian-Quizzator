import { App, Modal, Notice } from 'obsidian';
import { Quiz, QuizResult, calculateQuizResult } from '../models/quiz';
import { Question, QuestionResult } from '../models/question';
import { LLMProvider } from '../llm/llm-provider';
import { evaluateAnswer } from '../utils/scoring';

export class QuizModal extends Modal {
    private quiz: Quiz;
    private llmProvider: LLMProvider;
    private currentQuestionIndex: number = 0;
    private questionResults: QuestionResult[] = [];
    private currentAnswer: string | string[] | number | boolean | null = null;
    private isEvaluating: boolean = false;

    constructor(app: App, quiz: Quiz, llmProvider: LLMProvider) {
        super(app);
        this.quiz = quiz;
        this.llmProvider = llmProvider;
    }

    onOpen() {
        this.showQuestion();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private showQuestion() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('quizzator-modal');

        const question = this.quiz.questions[this.currentQuestionIndex];

        // Progress bar
        this.renderProgressBar(contentEl);

        // Question
        this.renderQuestion(contentEl, question);

        // Buttons
        this.renderButtons(contentEl);
    }

    private renderProgressBar(container: HTMLElement) {
        const progressContainer = container.createDiv({ cls: 'quizzator-progress' });

        const progressText = progressContainer.createDiv({ cls: 'quizzator-progress-text' });
        progressText.setText(
            `Question ${this.currentQuestionIndex + 1} of ${this.quiz.questions.length}`
        );

        const progressBar = progressContainer.createDiv({ cls: 'quizzator-progress-bar' });
        const progressFill = progressBar.createDiv({ cls: 'quizzator-progress-fill' });
        const progress = ((this.currentQuestionIndex) / this.quiz.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }

    private renderQuestion(container: HTMLElement, question: Question) {
        const questionContainer = container.createDiv({ cls: 'quizzator-question' });

        const questionText = questionContainer.createDiv({ cls: 'quizzator-question-text' });
        questionText.setText(question.q);

        if (question.weight > 1) {
            const weightBadge = questionText.createSpan({ cls: 'quizzator-question-weight' });
            weightBadge.setText(`×${question.weight}`);
        }

        // Render answer input based on question type
        switch (question.type) {
            case 'free-text':
                this.renderFreeTextInput(questionContainer);
                break;
            case 'mcq':
                this.renderMCQInput(questionContainer, question);
                break;
            case 'slider':
                this.renderSliderInput(questionContainer, question);
                break;
            case 'true-false':
                this.renderTrueFalseInput(questionContainer);
                break;
        }
    }

    private renderFreeTextInput(container: HTMLElement) {
        const textarea = container.createEl('textarea', {
            cls: 'quizzator-free-text',
            attr: { placeholder: 'Type your answer here...' }
        });

        textarea.addEventListener('input', () => {
            this.currentAnswer = textarea.value;
        });
    }

    private renderMCQInput(container: HTMLElement, question: any) {
        const optionsContainer = container.createDiv({ cls: 'quizzator-mcq-options' });
        this.currentAnswer = [];

        question.options.forEach((option: string, index: number) => {
            const optionDiv = optionsContainer.createDiv({ cls: 'quizzator-mcq-option' });

            const input = optionDiv.createEl('input', {
                type: question.multiple ? 'checkbox' : 'radio',
                attr: {
                    name: 'mcq-option',
                    value: option,
                    id: `option-${index}`
                }
            });

            const label = optionDiv.createEl('label', {
                text: option,
                attr: { for: `option-${index}` }
            });

            const updateAnswer = () => {
                if (question.multiple) {
                    const checked = Array.from(
                        optionsContainer.querySelectorAll('input:checked')
                    ) as HTMLInputElement[];
                    this.currentAnswer = checked.map(cb => cb.value);
                } else {
                    this.currentAnswer = [option];
                }

                // Update visual selection
                optionsContainer.querySelectorAll('.quizzator-mcq-option').forEach(div => {
                    div.removeClass('selected');
                });
                if (input.checked) {
                    optionDiv.addClass('selected');
                }
            };

            input.addEventListener('change', updateAnswer);
            optionDiv.addEventListener('click', (e) => {
                if (e.target !== input) {
                    input.checked = !input.checked;
                    if (!question.multiple) {
                        // Uncheck other radio buttons
                        optionsContainer.querySelectorAll('input').forEach(otherInput => {
                            if (otherInput !== input) {
                                (otherInput as HTMLInputElement).checked = false;
                            }
                        });
                    }
                    updateAnswer();
                }
            });
        });
    }

    private renderSliderInput(container: HTMLElement, question: any) {
        const sliderContainer = container.createDiv({ cls: 'quizzator-slider-container' });

        const valueDisplay = sliderContainer.createDiv({ cls: 'quizzator-slider-value' });
        const initialValue = Math.floor((question.min + question.max) / 2);
        valueDisplay.setText(String(initialValue));
        this.currentAnswer = initialValue;

        const slider = sliderContainer.createEl('input', {
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

        const labels = sliderContainer.createDiv({ cls: 'quizzator-slider-labels' });
        labels.createSpan({ text: String(question.min) });
        labels.createSpan({ text: String(question.max) });
    }

    private renderTrueFalseInput(container: HTMLElement) {
        const tfContainer = container.createDiv({ cls: 'quizzator-true-false' });

        const trueButton = tfContainer.createDiv({
            cls: 'quizzator-tf-button true',
            text: 'True'
        });

        const falseButton = tfContainer.createDiv({
            cls: 'quizzator-tf-button false',
            text: 'False'
        });

        trueButton.addEventListener('click', () => {
            this.currentAnswer = true;
            trueButton.addClass('selected');
            falseButton.removeClass('selected');
        });

        falseButton.addEventListener('click', () => {
            this.currentAnswer = false;
            falseButton.addClass('selected');
            trueButton.removeClass('selected');
        });
    }

    private renderButtons(container: HTMLElement) {
        const buttonsContainer = container.createDiv({ cls: 'quizzator-buttons' });

        if (this.currentQuestionIndex > 0) {
            const backButton = buttonsContainer.createEl('button', {
                cls: 'quizzator-button quizzator-button-secondary',
                text: 'Back'
            });
            backButton.addEventListener('click', () => {
                this.currentQuestionIndex--;
                this.showQuestion();
            });
        }

        const nextButton = buttonsContainer.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: this.currentQuestionIndex === this.quiz.questions.length - 1 ? 'Finish' : 'Next'
        });

        nextButton.addEventListener('click', () => this.handleNext());
    }

    private async handleNext() {
        if (this.currentAnswer === null ||
            (Array.isArray(this.currentAnswer) && this.currentAnswer.length === 0)) {
            new Notice('Please provide an answer');
            return;
        }

        if (this.isEvaluating) {
            return;
        }

        this.isEvaluating = true;
        this.showLoading();

        try {
            const question = this.quiz.questions[this.currentQuestionIndex];
            const result = await evaluateAnswer(
                question,
                this.currentAnswer,
                this.quiz.scoring,
                this.llmProvider
            );

            this.questionResults[this.currentQuestionIndex] = result;
            this.showQuestionResult(result);
        } catch (error) {
            new Notice(`Error evaluating answer: ${error.message}`);
            console.error(error);
            this.isEvaluating = false;
            this.showQuestion();
        }
    }

    private showLoading() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('quizzator-modal');

        const loadingContainer = contentEl.createDiv({ cls: 'quizzator-loading' });
        loadingContainer.createDiv({ cls: 'quizzator-loading-spinner' });
        loadingContainer.createDiv({
            cls: 'quizzator-loading-text',
            text: 'Evaluating your answer...'
        });
    }

    private showQuestionResult(result: QuestionResult) {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('quizzator-modal');

        const resultContainer = contentEl.createDiv({
            cls: `quizzator-result ${result.status}`
        });

        const statusEmoji = result.status === 'passed' ? '✓' :
                           result.status === 'imprecise' ? '~' : '✗';
        const statusText = result.status === 'passed' ? 'Passed' :
                          result.status === 'imprecise' ? 'Imprecise' : 'Failed';

        resultContainer.createDiv({
            cls: 'quizzator-result-score',
            text: `${statusEmoji} ${statusText} (${result.score}/100)`
        });

        if (result.explanation) {
            resultContainer.createDiv({
                cls: 'quizzator-result-explanation',
                text: result.explanation
            });
        }

        if (result.expectedAnswer) {
            const expectedDiv = resultContainer.createDiv({
                cls: 'quizzator-result-expected'
            });
            expectedDiv.createEl('strong', { text: 'Expected answer: ' });
            expectedDiv.appendText(result.expectedAnswer);
        }

        const buttonsContainer = contentEl.createDiv({ cls: 'quizzator-buttons' });

        const continueButton = buttonsContainer.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: this.currentQuestionIndex === this.quiz.questions.length - 1
                ? 'View Results'
                : 'Continue'
        });

        continueButton.addEventListener('click', () => {
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
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('quizzator-modal');

        const quizResult = calculateQuizResult(this.quiz, this.questionResults);

        const resultsContainer = contentEl.createDiv({ cls: 'quizzator-final-results' });

        const header = resultsContainer.createDiv({ cls: 'quizzator-final-header' });
        header.createDiv({
            cls: 'quizzator-final-title',
            text: 'Quiz Results'
        });

        header.createDiv({
            cls: `quizzator-final-score ${quizResult.status}`,
            text: `${Math.round(quizResult.totalScore)}/100`
        });

        const statusEmoji = quizResult.status === 'passed' ? '✓' :
                           quizResult.status === 'imprecise' ? '~' : '✗';
        const statusText = quizResult.status === 'passed' ? 'Passed' :
                          quizResult.status === 'imprecise' ? 'Imprecise' : 'Failed';

        header.createDiv({
            cls: 'quizzator-final-status',
            text: `${statusEmoji} ${statusText}`
        });

        resultsContainer.createEl('p', {
            text: `Score: ${Math.round(quizResult.rawScore)}/${quizResult.maxScore} points`
        });

        resultsContainer.createEl('h3', { text: 'Question Summary' });

        this.questionResults.forEach((result, index) => {
            const summaryDiv = resultsContainer.createDiv({ cls: 'quizzator-question-summary' });

            const textDiv = summaryDiv.createDiv({ cls: 'quizzator-question-summary-text' });
            const statusEmoji = result.status === 'passed' ? '✓' :
                               result.status === 'imprecise' ? '~' : '✗';
            textDiv.setText(`${statusEmoji} Question ${index + 1}`);

            const scoreDiv = summaryDiv.createDiv({ cls: 'quizzator-question-summary-score' });
            scoreDiv.setText(`${result.score}/100 (×${result.question.weight})`);
        });

        const buttonsContainer = contentEl.createDiv({ cls: 'quizzator-buttons' });

        const closeButton = buttonsContainer.createEl('button', {
            cls: 'quizzator-button quizzator-button-primary',
            text: 'Close'
        });

        closeButton.addEventListener('click', () => this.close());
    }
}
