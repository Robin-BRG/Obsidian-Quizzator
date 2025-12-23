/**
 * Base interface for all question types
 */
export interface BaseQuestion {
    type: QuestionType;
    q: string;
    weight: number;
}

/**
 * Question types supported by Quizzator
 */
export type QuestionType = 'free-text' | 'mcq' | 'slider' | 'true-false';

/**
 * Free text question - requires LLM evaluation
 */
export interface FreeTextQuestion extends BaseQuestion {
    type: 'free-text';
    answer: string;
    context?: string;
}

/**
 * Multiple choice question
 */
export interface MCQQuestion extends BaseQuestion {
    type: 'mcq';
    options: string[];
    answer: string[];
    multiple: boolean;
}

/**
 * Slider question - numerical value with range
 */
export interface SliderQuestion extends BaseQuestion {
    type: 'slider';
    answer: number;
    min: number;
    max: number;
    step?: number;
    tolerance?: number;
}

/**
 * True/False question
 */
export interface TrueFalseQuestion extends BaseQuestion {
    type: 'true-false';
    answer: boolean;
}

/**
 * Union type of all question types
 */
export type Question = FreeTextQuestion | MCQQuestion | SliderQuestion | TrueFalseQuestion;

/**
 * Result of answering a question
 */
export interface QuestionResult {
    question: Question;
    userAnswer: string | string[] | number | boolean;
    score: number; // 0-100
    status: 'passed' | 'imprecise' | 'failed';
    explanation?: string;
    expectedAnswer?: string;
}

/**
 * Determines the status based on score and thresholds
 */
export function getQuestionStatus(
    score: number,
    minScoreToPass: number,
    minScoreToFail: number
): 'passed' | 'imprecise' | 'failed' {
    if (score >= minScoreToPass) {
        return 'passed';
    } else if (score >= minScoreToFail) {
        return 'imprecise';
    } else {
        return 'failed';
    }
}
