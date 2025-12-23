import { Plugin, TFile, Notice, MarkdownView } from 'obsidian';
import { QuizzatorSettings, DEFAULT_SETTINGS, QuizzatorSettingTab } from './settings';
import { QuizzatorSidebarView, QUIZZATOR_VIEW_TYPE } from './ui/sidebar-view';
import { QuizModal } from './ui/quiz-modal';
import { LLMProvider } from './llm/llm-provider';
import { OpenAIProvider } from './llm/openai-provider';
import { AnthropicProvider } from './llm/anthropic-provider';
import { OllamaProvider } from './llm/ollama-provider';
import { findAllQuizzes, loadQuizFromFile, QuizFileInfo } from './utils/quiz-finder';
import { Quiz } from './models/quiz';
import { isAbsolutePath, resolveToVaultRelative } from './utils/path-utils';

export default class QuizzatorPlugin extends Plugin {
    settings: QuizzatorSettings;

    async onload() {
        await this.loadSettings();

        // Register sidebar view
        this.registerView(
            QUIZZATOR_VIEW_TYPE,
            (leaf) => new QuizzatorSidebarView(leaf, this)
        );

        // Add ribbon icon to open sidebar
        this.addRibbonIcon('list-checks', 'Open Quizzator', () => {
            this.activateSidebarView();
        });

        // Add command to launch quiz from current file
        this.addCommand({
            id: 'launch-quiz-current-file',
            name: 'Launch quiz from current file',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    if (!checking) {
                        this.launchQuiz(activeFile);
                    }
                    return true;
                }
                return false;
            }
        });

        // Add command to open sidebar
        this.addCommand({
            id: 'open-quizzator-sidebar',
            name: 'Open Quizzator sidebar',
            callback: () => {
                this.activateSidebarView();
            }
        });

        // Add settings tab
        this.addSettingTab(new QuizzatorSettingTab(this.app, this));

        // Register markdown post processor for inline quiz buttons
        this.registerMarkdownCodeBlockProcessor('quiz-button', (source, el, ctx) => {
            const lines = source.split('\n');
            let quizPath = '';

            for (const line of lines) {
                const match = line.match(/path:\s*(.+)/);
                if (match) {
                    quizPath = match[1].trim();
                    break;
                }
            }

            if (!quizPath) {
                el.createEl('p', {
                    text: 'Error: No quiz path specified',
                    cls: 'quizzator-error'
                });
                return;
            }

            const button = el.createEl('button', {
                text: '▶ Launch Quiz',
                cls: 'quizzator-button quizzator-button-primary'
            });

            button.addEventListener('click', async () => {
                // Convert absolute path to vault-relative if needed
                let resolvedPath = quizPath;
                if (isAbsolutePath(quizPath)) {
                    const relativePath = resolveToVaultRelative(this.app.vault, quizPath);
                    if (relativePath) {
                        resolvedPath = relativePath;
                    } else {
                        new Notice(`Path is not within the vault: ${quizPath}`);
                        return;
                    }
                }

                const file = this.app.vault.getAbstractFileByPath(resolvedPath);
                if (file instanceof TFile) {
                    await this.launchQuiz(file);
                } else {
                    new Notice(`Quiz file not found: ${quizPath}`);
                }
            });
        });

        console.log('Quizzator plugin loaded');
    }

    onunload() {
        console.log('Quizzator plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateSidebarView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(QUIZZATOR_VIEW_TYPE)[0];

        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                await rightLeaf.setViewState({
                    type: QUIZZATOR_VIEW_TYPE,
                    active: true
                });
                leaf = rightLeaf;
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async findAllQuizzes(): Promise<QuizFileInfo[]> {
        return findAllQuizzes(this.app.vault, this.settings.quizFolder);
    }

    async launchQuiz(file: TFile) {
        try {
            const quiz = await loadQuizFromFile(this.app.vault, file);
            const llmProvider = this.getLLMProvider();

            if (!llmProvider) {
                new Notice('Please configure an LLM provider in settings');
                return;
            }

            // Test LLM connection for free-text questions
            const hasFreeText = quiz.questions.some(q => q.type === 'free-text');
            if (hasFreeText) {
                new Notice('Testing LLM connection...');
                const connected = await llmProvider.testConnection();
                if (!connected) {
                    new Notice('Failed to connect to LLM provider. Check your settings.');
                    return;
                }
            }

            const modal = new QuizModal(this.app, quiz, llmProvider, this.settings.responseLanguage);
            modal.open();
        } catch (error) {
            new Notice(`Failed to launch quiz: ${error.message}`);
            console.error('Quiz launch error:', error);
        }
    }

    private getLLMProvider(): LLMProvider | null {
        const { settings } = this;

        try {
            switch (settings.llmProvider) {
                case 'openai':
                    if (!settings.openaiApiKey) {
                        new Notice('OpenAI API key not configured');
                        return null;
                    }
                    return new OpenAIProvider(settings.openaiApiKey, settings.openaiModel);

                case 'anthropic':
                    if (!settings.anthropicApiKey) {
                        new Notice('Anthropic API key not configured');
                        return null;
                    }
                    return new AnthropicProvider(settings.anthropicApiKey, settings.anthropicModel);

                case 'ollama':
                    if (!settings.ollamaUrl || !settings.ollamaModel) {
                        new Notice('Ollama configuration incomplete');
                        return null;
                    }
                    return new OllamaProvider(settings.ollamaUrl, settings.ollamaModel);

                default:
                    new Notice('Invalid LLM provider selected');
                    return null;
            }
        } catch (error) {
            console.error('Error creating LLM provider:', error);
            new Notice(`Failed to initialize LLM provider: ${error.message}`);
            return null;
        }
    }
}
