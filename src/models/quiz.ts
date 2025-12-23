import { Question, QuestionResult } from './question';

/**
 * Scoring configuration for a quiz
 */
export interface QuizScoring {
    min_score_to_pass: number;
    min_score_to_fail: number;
}

/**
 * Quiz definition from YAML
 */
export interface Quiz {
    title: string;
    description?: string;
    scoring: QuizScoring;
    questions: Question[];
}

/**
 * Complete quiz result after all questions answered
 */
export interface QuizResult {
    quiz: Quiz;
    questionResults: QuestionResult[];
    totalScore: number; // Weighted average 0-100
    rawScore: number; // Total weighted points earned
    maxScore: number; // Total weighted points possible
    status: 'passed' | 'imprecise' | 'failed';
    completedAt: Date;
}

/**
 * Calculates the final quiz score and status
 */
export function calculateQuizResult(
    quiz: Quiz,
    questionResults: QuestionResult[]
): QuizResult {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const result of questionResults) {
        const weight = result.question.weight;
        totalWeightedScore += result.score * weight;
        totalWeight += weight;
    }

    const totalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const rawScore = totalWeightedScore;
    const maxScore = totalWeight * 100;

    let status: 'passed' | 'imprecise' | 'failed';
    if (totalScore >= quiz.scoring.min_score_to_pass) {
        status = 'passed';
    } else if (totalScore >= quiz.scoring.min_score_to_fail) {
        status = 'imprecise';
    } else {
        status = 'failed';
    }

    return {
        quiz,
        questionResults,
        totalScore,
        rawScore,
        maxScore,
        status,
        completedAt: new Date()
    };
}
