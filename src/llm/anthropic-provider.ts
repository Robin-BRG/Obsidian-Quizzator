import { requestUrl } from 'obsidian';
import { LLMProvider, LLMEvaluationResult, buildEvaluationPrompt } from './llm-provider';
import { FreeTextQuestion } from '../models/question';

export class AnthropicProvider implements LLMProvider {
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
                url: 'https://api.anthropic.com/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1024,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3
                })
            });

            if (response.status !== 200) {
                throw new Error(`Anthropic API error: ${response.status}`);
            }

            const data = response.json;
            const content = data.content[0];

            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Anthropic');
            }

            // Extract JSON from response (Claude might wrap it in markdown)
            let jsonText = content.text.trim();
            const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonText = jsonMatch[1];
            }

            const result = JSON.parse(jsonText);

            return {
                score: Math.max(0, Math.min(100, result.score)),
                explanation: result.explanation,
                expectedAnswer: result.expectedAnswer
            };
        } catch (error) {
            throw new Error(`Anthropic evaluation failed: ${error.message}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: 'https://api.anthropic.com/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });

            return response.status === 200;
        } catch (error) {
            console.error('[Quizzator] Anthropic connection test failed:', error);
            return false;
        }
    }
}
