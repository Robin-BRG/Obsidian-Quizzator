import { requestUrl } from 'obsidian';
import { LLMProvider, LLMEvaluationResult, buildEvaluationPrompt } from './llm-provider';
import { FreeTextQuestion } from '../models/question';

export class OllamaProvider implements LLMProvider {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.model = model;
    }

    async evaluateAnswer(
        question: FreeTextQuestion,
        userAnswer: string,
        language: string
    ): Promise<LLMEvaluationResult> {
        try {
            const prompt = buildEvaluationPrompt(question, userAnswer, language);

            const response = await requestUrl({
                url: `${this.baseUrl}/api/generate`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    format: 'json'
                })
            });

            if (response.status !== 200) {
                throw new Error(`Ollama request failed: ${response.status}`);
            }

            const data = response.json;
            const result = JSON.parse(data.response);

            return {
                score: Math.max(0, Math.min(100, result.score)),
                explanation: result.explanation,
                expectedAnswer: result.expectedAnswer
            };
        } catch (error) {
            throw new Error(`Ollama evaluation failed: ${error.message}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: `${this.baseUrl}/api/tags`,
                method: 'GET'
            });

            return response.status === 200;
        } catch (error) {
            console.error('[Quizzator] Ollama connection test failed:', error);
            return false;
        }
    }
}
