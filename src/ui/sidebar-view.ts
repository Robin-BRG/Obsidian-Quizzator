import { ItemView, WorkspaceLeaf } from 'obsidian';
import QuizzatorPlugin from '../main';
import { QuizFileInfo } from '../utils/quiz-finder';

export const QUIZZATOR_VIEW_TYPE = 'quizzator-sidebar';

export class QuizzatorSidebarView extends ItemView {
    private plugin: QuizzatorPlugin;
    private quizzes: QuizFileInfo[] = [];

    constructor(leaf: WorkspaceLeaf, plugin: QuizzatorPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return QUIZZATOR_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Quizzator';
    }

    getIcon(): string {
        return 'list-checks';
    }

    async onOpen(): Promise<void> {
        await this.refresh();
    }

    async onClose(): Promise<void> {
        // Cleanup if needed
    }

    async refresh(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('quizzator-sidebar');

        const header = contentEl.createDiv({ cls: 'quizzator-sidebar-header' });
        header.createDiv({ cls: 'quizzator-sidebar-title', text: 'Available quizzes' });

        const refreshButton = header.createEl('button', {
            cls: 'quizzator-button quizzator-button-secondary',
            text: '↻'
        });
        refreshButton.addEventListener('click', () => {
            void this.refresh();
        });

        // Load quizzes
        try {
            this.quizzes = await this.plugin.findAllQuizzes();

            if (this.quizzes.length === 0) {
                contentEl.createDiv({
                    text: 'No quizzes found. Create a quiz by adding YAML frontmatter to a note.',
                    cls: 'quizzator-empty-state'
                });
                return;
            }

            // Display quizzes
            this.quizzes.forEach(quizInfo => {
                const quizItem = contentEl.createDiv({ cls: 'quizzator-quiz-item' });

                quizItem.createDiv({
                    cls: 'quizzator-quiz-item-title',
                    text: quizInfo.quiz.title
                });

                if (quizInfo.quiz.description) {
                    quizItem.createDiv({
                        cls: 'quizzator-quiz-item-desc',
                        text: quizInfo.quiz.description
                    });
                }

                const meta = quizItem.createDiv({ cls: 'quizzator-quiz-item-meta' });
                meta.createSpan({ text: `${quizInfo.quiz.questions.length} questions` });
                meta.createSpan({ text: `Pass: ${quizInfo.quiz.scoring.min_score_to_pass}%` });

                quizItem.addEventListener('click', () => {
                    void this.plugin.launchQuiz(quizInfo.file);
                });
            });
        } catch (error) {
            contentEl.createDiv({
                text: `Error loading quizzes: ${(error as Error).message}`,
                cls: 'quizzator-error'
            });
        }
    }
}
