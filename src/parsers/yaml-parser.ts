import * as yaml from 'js-yaml';
import { Quiz, QuizScoring } from '../models/quiz';
import { Question, QuestionType } from '../models/question';

interface ParsedQuizData {
    quiz?: ParsedQuizData;
    title?: string;
    description?: string;
    scoring?: {
        min_score_to_pass?: number;
        min_score_to_fail?: number;
    };
    questions?: ParsedQuestionData[];
}

interface ParsedQuestionData {
    type?: string;
    q?: string;
    answer?: string | number | boolean | string[];
    context?: string;
    options?: string[];
    multiple?: boolean;
    min?: number;
    max?: number;
    step?: number;
    tolerance?: number;
    weight?: number;
}

/**
 * Parses a YAML string into a Quiz object
 */
export function parseQuizYAML(yamlContent: string): Quiz {
    try {
        const parsed = yaml.load(yamlContent) as ParsedQuizData;

        // Support both formats: with "quiz:" root or direct properties
        const quizData = parsed.quiz ?? parsed;

        // Validate required fields
        if (!quizData.title) {
            throw new Error('Quiz must have a title');
        }

        if (!quizData.scoring) {
            throw new Error('Quiz must have scoring configuration');
        }

        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error('Quiz must have a questions array');
        }

        // Parse scoring
        const scoring: QuizScoring = {
            min_score_to_pass: quizData.scoring.min_score_to_pass ?? 80,
            min_score_to_fail: quizData.scoring.min_score_to_fail ?? 60
        };

        // Validate scoring thresholds
        if (scoring.min_score_to_pass < scoring.min_score_to_fail) {
            throw new Error('min_score_to_pass must be >= min_score_to_fail');
        }

        // Parse questions
        const questions: Question[] = quizData.questions.map((q: ParsedQuestionData, index: number) => {
            return parseQuestion(q, index);
        });

        return {
            title: quizData.title,
            description: quizData.description,
            scoring,
            questions
        };
    } catch (error) {
        throw new Error(`Failed to parse quiz YAML: ${(error as Error).message}`);
    }
}

/**
 * Parses a single question from YAML
 */
function parseQuestion(questionData: ParsedQuestionData, index: number): Question {
    const type = questionData.type as QuestionType;
    const weight = questionData.weight ?? 1;

    if (!questionData.q) {
        throw new Error(`Question ${index + 1} must have a "q" field`);
    }

    if (weight <= 0) {
        throw new Error(`Question ${index + 1} weight must be positive`);
    }

    switch (type) {
        case 'free-text':
            return {
                type: 'free-text',
                q: questionData.q,
                answer: questionData.answer as string,
                context: questionData.context,
                weight
            };

        case 'mcq':
            if (!Array.isArray(questionData.options) || questionData.options.length < 2) {
                throw new Error(`Question ${index + 1} (MCQ) must have at least 2 options`);
            }
            if (!Array.isArray(questionData.answer)) {
                throw new Error(`Question ${index + 1} (MCQ) answer must be an array`);
            }
            return {
                type: 'mcq',
                q: questionData.q,
                options: questionData.options,
                answer: questionData.answer,
                multiple: questionData.multiple ?? false,
                weight
            };

        case 'slider':
            if (typeof questionData.answer !== 'number') {
                throw new Error(`Question ${index + 1} (slider) answer must be a number`);
            }
            if (typeof questionData.min !== 'number' || typeof questionData.max !== 'number') {
                throw new Error(`Question ${index + 1} (slider) must have min and max values`);
            }
            if (questionData.min >= questionData.max) {
                throw new Error(`Question ${index + 1} (slider) min must be < max`);
            }
            return {
                type: 'slider',
                q: questionData.q,
                answer: questionData.answer,
                min: questionData.min,
                max: questionData.max,
                step: questionData.step ?? 1,
                tolerance: questionData.tolerance,
                weight
            };

        case 'true-false':
            if (typeof questionData.answer !== 'boolean') {
                throw new Error(`Question ${index + 1} (true-false) answer must be a boolean`);
            }
            return {
                type: 'true-false',
                q: questionData.q,
                answer: questionData.answer,
                weight
            };

        default:
            throw new Error(`Question ${index + 1} has invalid type: ${String(questionData.type)}`);
    }
}

/**
 * Extracts quiz YAML from a markdown file
 * Supports both YAML frontmatter (---) and quiz code blocks (```quiz)
 */
export function extractQuizFromMarkdown(content: string): string | null {
    // First, try to match quiz code block (```quiz ... ```)
    const codeBlockRegex = /```quiz\s*\n([\s\S]*?)\n```/;
    const codeBlockMatch = content.match(codeBlockRegex);

    if (codeBlockMatch) {
        return codeBlockMatch[1];
    }

    // Fall back to YAML frontmatter (between --- markers)
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
    const frontmatterMatch = content.match(frontmatterRegex);

    if (frontmatterMatch) {
        const yamlContent = frontmatterMatch[1];
        // Check if it contains a quiz definition
        if (yamlContent.includes('quiz:') || yamlContent.includes('title:')) {
            return yamlContent;
        }
    }

    return null;
}
