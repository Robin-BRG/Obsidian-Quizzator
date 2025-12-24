import {
    Question,
    QuestionResult,
    MCQQuestion,
    SliderQuestion,
    TrueFalseQuestion,
    FreeTextQuestion,
    getQuestionStatus
} from '../models/question';
import { QuizScoring } from '../models/quiz';
import { LLMProvider } from '../llm/llm-provider';

/**
 * Evaluates a user's answer to a question
 */
export async function evaluateAnswer(
    question: Question,
    userAnswer: string | string[] | number | boolean,
    scoring: QuizScoring,
    llmProvider?: LLMProvider,
    language: string = 'Français'
): Promise<QuestionResult> {
    let score: number;
    let explanation: string | undefined;
    let expectedAnswer: string | undefined;

    switch (question.type) {
        case 'free-text': {
            if (!llmProvider) {
                throw new Error('LLM provider required for free-text questions');
            }
            const llmResult = await llmProvider.evaluateAnswer(
                question,
                userAnswer as string,
                language
            );
            score = llmResult.score;
            explanation = llmResult.explanation;
            expectedAnswer = llmResult.expectedAnswer;
            break;
        }

        case 'mcq': {
            const mcqResult = evaluateMCQ(question, userAnswer as string[]);
            score = mcqResult.score;
            explanation = mcqResult.explanation;
            expectedAnswer = mcqResult.expectedAnswer;
            break;
        }

        case 'slider': {
            const sliderResult = evaluateSlider(question, userAnswer as number);
            score = sliderResult.score;
            explanation = sliderResult.explanation;
            expectedAnswer = sliderResult.expectedAnswer;
            break;
        }

        case 'true-false': {
            const tfResult = evaluateTrueFalse(question, userAnswer as boolean);
            score = tfResult.score;
            explanation = tfResult.explanation;
            expectedAnswer = tfResult.expectedAnswer;
            break;
        }

        default: {
            const _exhaustiveCheck: never = question;
            throw new Error('Unknown question type');
        }
    }

    const status = getQuestionStatus(score, scoring.min_score_to_pass, scoring.min_score_to_fail);

    return {
        question,
        userAnswer,
        score,
        status,
        explanation,
        expectedAnswer
    };
}

/**
 * Evaluates a multiple choice question
 */
function evaluateMCQ(
    question: MCQQuestion,
    userAnswer: string[]
): { score: number; explanation: string; expectedAnswer: string } {
    const correctAnswers = new Set(question.answer);
    const userAnswers = new Set(userAnswer);

    if (!question.multiple) {
        // Single choice - binary scoring
        const isCorrect = userAnswers.size === 1 &&
            correctAnswers.size === 1 &&
            userAnswers.has(Array.from(correctAnswers)[0]);

        return {
            score: isCorrect ? 100 : 0,
            explanation: isCorrect
                ? 'Correct!'
                : `Incorrect. You selected: ${Array.from(userAnswers).join(', ')}`,
            expectedAnswer: Array.from(correctAnswers).join(', ')
        };
    } else {
        // Multiple choice - proportional scoring
        let correctSelections = 0;
        let incorrectSelections = 0;

        for (const answer of userAnswers) {
            if (correctAnswers.has(answer)) {
                correctSelections++;
            } else {
                incorrectSelections++;
            }
        }

        const missedAnswers = correctAnswers.size - correctSelections;

        // Score = (correct - incorrect) / total correct answers
        // This penalizes both missing correct answers and selecting wrong ones
        const score = Math.max(
            0,
            Math.round((correctSelections - incorrectSelections) / correctAnswers.size * 100)
        );

        let explanation = '';
        if (score === 100) {
            explanation = 'Perfect! All correct answers selected.';
        } else {
            const parts = [];
            if (correctSelections > 0) {
                parts.push(`${correctSelections} correct`);
            }
            if (incorrectSelections > 0) {
                parts.push(`${incorrectSelections} incorrect`);
            }
            if (missedAnswers > 0) {
                parts.push(`${missedAnswers} missed`);
            }
            explanation = parts.join(', ');
        }

        return {
            score,
            explanation,
            expectedAnswer: Array.from(correctAnswers).join(', ')
        };
    }
}

/**
 * Evaluates a slider question
 */
function evaluateSlider(
    question: SliderQuestion,
    userAnswer: number
): { score: number; explanation: string; expectedAnswer: string } {
    const correctAnswer = question.answer;
    const tolerance = question.tolerance;

    if (tolerance !== undefined) {
        // Binary scoring with tolerance
        const isWithinTolerance = Math.abs(userAnswer - correctAnswer) <= tolerance;
        return {
            score: isWithinTolerance ? 100 : 0,
            explanation: isWithinTolerance
                ? `Correct! Your answer ${userAnswer} is within ±${tolerance} of the correct answer.`
                : `Incorrect. Your answer ${userAnswer} is outside the tolerance range of ±${tolerance}.`,
            expectedAnswer: `${correctAnswer} (±${tolerance})`
        };
    } else {
        // Exact match required
        const isExact = userAnswer === correctAnswer;
        return {
            score: isExact ? 100 : 0,
            explanation: isExact
                ? `Perfect! Exact answer.`
                : `Incorrect. You answered ${userAnswer}.`,
            expectedAnswer: String(correctAnswer)
        };
    }
}

/**
 * Evaluates a true/false question
 */
function evaluateTrueFalse(
    question: TrueFalseQuestion,
    userAnswer: boolean
): { score: number; explanation: string; expectedAnswer: string } {
    const isCorrect = userAnswer === question.answer;

    return {
        score: isCorrect ? 100 : 0,
        explanation: isCorrect ? 'Correct!' : `Incorrect. You answered: ${userAnswer}`,
        expectedAnswer: String(question.answer)
    };
}
