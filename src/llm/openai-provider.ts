import { requestUrl } from 'obsidian';
import { LLMProvider, LLMEvaluationResult, buildEvaluationPrompt } from './llm-provider';
import { FreeTextQuestion } from '../models/question';

export class OpenAIProvider implements LLMProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string) {
        this.apiKey = apiKey;
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
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    response_format: { type: 'json_object' }
                })
            });

            if (response.status !== 200) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = response.json;
            const content = data.choices[0].message.content;

            if (!content) {
                throw new Error('Empty response from OpenAI');
            }

            const result = JSON.parse(content);

            return {
                score: Math.max(0, Math.min(100, result.score)),
                explanation: result.explanation,
                expectedAnswer: result.expectedAnswer
            };
        } catch (error) {
            throw new Error(`OpenAI evaluation failed: ${error.message}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            console.log('[Quizzator] Testing OpenAI connection...');
            console.log('[Quizzator] Model:', this.model);
            console.log('[Quizzator] API Key length:', this.apiKey?.length || 0);

            const response = await requestUrl({
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });

            console.log('[Quizzator] Response status:', response.status);

            if (response.status !== 200) {
                console.error('[Quizzator] Error response:', response.text);
            }

            return response.status === 200;
        } catch (error) {
            console.error('[Quizzator] OpenAI connection test failed:', error);
            return false;
        }
    }
}
