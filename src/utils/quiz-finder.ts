import { TFile, Vault } from 'obsidian';
import { extractQuizFromMarkdown, parseQuizYAML } from '../parsers/yaml-parser';
import { Quiz } from '../models/quiz';
import { isAbsolutePath, resolveToVaultRelative, normalizePath } from './path-utils';

/**
 * Information about a quiz file
 */
export interface QuizFileInfo {
    file: TFile;
    quiz: Quiz;
}

/**
 * Finds all quiz files in the specified folder (recursive)
 */
export async function findAllQuizzes(vault: Vault, folderPath: string = ''): Promise<QuizFileInfo[]> {
    const quizFiles: QuizFileInfo[] = [];
    const markdownFiles = vault.getMarkdownFiles();

    // Convert absolute path to vault-relative if needed
    let normalizedFolder = folderPath;
    if (isAbsolutePath(folderPath)) {
        const relativePath = resolveToVaultRelative(vault, folderPath);
        normalizedFolder = relativePath || '';
    }

    // Normalize: remove trailing slash and use forward slashes
    normalizedFolder = normalizePath(normalizedFolder).replace(/\/$/, '');

    // Filter by folder if specified
    const filesToScan = normalizedFolder
        ? markdownFiles.filter(file =>
            file.path.startsWith(normalizedFolder + '/') ||
            file.parent?.path === normalizedFolder)
        : markdownFiles;

    for (const file of filesToScan) {
        try {
            const content = await vault.read(file);
            const yamlContent = extractQuizFromMarkdown(content);

            if (yamlContent) {
                const quiz = parseQuizYAML(yamlContent);
                quizFiles.push({ file, quiz });
            }
        } catch (error) {
            console.warn(`Failed to parse quiz from ${file.path}:`, error);
        }
    }

    return quizFiles;
}

/**
 * Loads a quiz from a specific file
 */
export async function loadQuizFromFile(vault: Vault, file: TFile): Promise<Quiz> {
    const content = await vault.read(file);
    const yamlContent = extractQuizFromMarkdown(content);

    if (!yamlContent) {
        throw new Error('No quiz found in this file');
    }

    return parseQuizYAML(yamlContent);
}
