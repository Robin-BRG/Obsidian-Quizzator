import { App, PluginSettingTab, Setting } from 'obsidian';
import QuizzatorPlugin from './main';

export type LLMProvider = 'openai' | 'anthropic' | 'ollama';

const LANGUAGES = [
    { value: 'Français', label: 'Français' },
    { value: 'English', label: 'English' },
    { value: 'Español', label: 'Español' },
    { value: 'Deutsch', label: 'Deutsch' },
    { value: 'Italiano', label: 'Italiano' },
    { value: 'Português', label: 'Português' },
    { value: '日本語', label: '日本語' },
    { value: '中文', label: '中文' },
];

export interface QuizzatorSettings {
    quizFolder: string;
    llmProvider: LLMProvider;
    openaiApiKey: string;
    openaiModel: string;
    anthropicApiKey: string;
    anthropicModel: string;
    ollamaUrl: string;
    ollamaModel: string;
    responseLanguage: string;
}

export const DEFAULT_SETTINGS: QuizzatorSettings = {
    quizFolder: '',
    llmProvider: 'openai',
    openaiApiKey: '',
    openaiModel: 'gpt-4o-mini',
    anthropicApiKey: '',
    anthropicModel: 'claude-3-5-sonnet-20241022',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    responseLanguage: 'Français'
};

export class QuizzatorSettingTab extends PluginSettingTab {
    plugin: QuizzatorPlugin;

    constructor(app: App, plugin: QuizzatorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Quiz configuration
        new Setting(containerEl)
            .setName('Quiz configuration')
            .setHeading();

        new Setting(containerEl)
            .setName('Quiz folder')
            .setDesc('Full path to the folder containing your quiz files (e.g., C:\\Users\\...\\Quizzes)')
            .setClass('quizzator-setting-wide')
            .addText(text => {
                text.setPlaceholder('C:\\Users\\...\\Quizzes')
                    .setValue(this.plugin.settings.quizFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.quizFolder = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.addClass('quizzator-input-wide');
            });

        new Setting(containerEl)
            .setName('Response language')
            .setDesc('Language for LLM responses and explanations')
            .addDropdown(dropdown => {
                LANGUAGES.forEach(lang => {
                    dropdown.addOption(lang.value, lang.label);
                });
                dropdown.setValue(this.plugin.settings.responseLanguage);
                dropdown.onChange(async (value) => {
                    this.plugin.settings.responseLanguage = value;
                    await this.plugin.saveSettings();
                });
            });

        // LLM Provider Selection
        new Setting(containerEl)
            .setName('LLM provider')
            .setHeading();

        new Setting(containerEl)
            .setName('Provider')
            .setDesc('Choose which AI provider to use for evaluating quiz answers')
            .addDropdown(dropdown => dropdown
                .addOption('openai', 'OpenAI (GPT)')
                .addOption('anthropic', 'Anthropic (Claude)')
                .addOption('ollama', 'Ollama (Local)')
                .setValue(this.plugin.settings.llmProvider)
                .onChange(async (value) => {
                    this.plugin.settings.llmProvider = value as LLMProvider;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh to show relevant settings
                }));

        // OpenAI Settings
        if (this.plugin.settings.llmProvider === 'openai') {
            new Setting(containerEl)
                .setName('OpenAI configuration')
                .setHeading();

            new Setting(containerEl)
                .setName('API key')
                .setDesc('Your OpenAI API key (starts with sk-...)')
                .addText(text => text
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.openaiApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiApiKey = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Model name')
                .setDesc('Enter the exact model name (e.g., gpt-4o-mini, gpt-4o, gpt-4, gpt-3.5-turbo)')
                .addText(text => text
                    .setPlaceholder('gpt-4o-mini')
                    .setValue(this.plugin.settings.openaiModel)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiModel = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // Anthropic Settings
        if (this.plugin.settings.llmProvider === 'anthropic') {
            new Setting(containerEl)
                .setName('Anthropic configuration')
                .setHeading();

            new Setting(containerEl)
                .setName('API key')
                .setDesc('Your Anthropic API key (starts with sk-ant-...)')
                .addText(text => text
                    .setPlaceholder('sk-ant-...')
                    .setValue(this.plugin.settings.anthropicApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicApiKey = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Model name')
                .setDesc('Enter the exact model name (e.g., claude-3-5-sonnet-20241022, claude-3-opus-20240229, claude-3-haiku-20240307)')
                .addText(text => text
                    .setPlaceholder('claude-3-5-sonnet-20241022')
                    .setValue(this.plugin.settings.anthropicModel)
                    .onChange(async (value) => {
                        this.plugin.settings.anthropicModel = value;
                        await this.plugin.saveSettings();
                    }));
        }

        // Ollama Settings
        if (this.plugin.settings.llmProvider === 'ollama') {
            new Setting(containerEl)
                .setName('Ollama configuration')
                .setHeading();

            new Setting(containerEl)
                .setName('Ollama URL')
                .setDesc('URL of your Ollama instance')
                .addText(text => text
                    .setPlaceholder('http://localhost:11434')
                    .setValue(this.plugin.settings.ollamaUrl)
                    .onChange(async (value) => {
                        this.plugin.settings.ollamaUrl = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Model')
                .setDesc('Ollama model name (e.g., llama2, mistral)')
                .addText(text => text
                    .setPlaceholder('llama2')
                    .setValue(this.plugin.settings.ollamaModel)
                    .onChange(async (value) => {
                        this.plugin.settings.ollamaModel = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
