import { FreeTextQuestion } from '../models/question';

/**
 * Result from LLM evaluation of a free-text answer
 */
export interface LLMEvaluationResult {
    score: number; // 0-100
    explanation: string;
    expectedAnswer: string;
}

/**
 * Abstract interface for LLM providers
 */
export interface LLMProvider {
    /**
     * Evaluates a free-text answer using the LLM
     */
    evaluateAnswer(
        question: FreeTextQuestion,
        userAnswer: string,
        language: string
    ): Promise<LLMEvaluationResult>;

    /**
     * Tests the connection to the LLM provider
     */
    testConnection(): Promise<boolean>;
}

/**
 * Builds the prompt for evaluating a free-text answer
 */
export function buildEvaluationPrompt(
    question: FreeTextQuestion,
    userAnswer: string,
    language: string = 'Français'
): string {
    return `You are an expert quiz evaluator. Evaluate the following answer.

IMPORTANT: You MUST respond entirely in ${language}.

Question: ${question.q}

Expected Answer: ${question.answer}

${question.context ? `Additional Context: ${question.context}` : ''}

User's Answer: ${userAnswer}

Evaluate and respond with this exact JSON format:
{
    "score": <number 0-100>,
    "explanation": "<brief feedback in ${language}, 1-2 sentences max>",
    "expectedAnswer": "<the correct answer in ${language}, concise>"
}

Scoring guidelines:
- 100: Perfect or near-perfect answer
- 70-99: Good answer with minor issues
- 40-69: Partial understanding, missing key elements
- 0-39: Incorrect or very incomplete

CRITICAL:
- Respond ONLY with JSON, no other text
- Keep explanation SHORT (1-2 sentences)
- expectedAnswer should be the ANSWER only, not your reasoning
- Everything must be in ${language}`;
}
