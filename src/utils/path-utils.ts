import { Vault, FileSystemAdapter } from 'obsidian';

/**
 * Gets the vault's base path on the filesystem
 */
export function getVaultBasePath(vault: Vault): string {
    if (vault.adapter instanceof FileSystemAdapter) {
        return vault.adapter.getBasePath();
    }
    return '';
}

/**
 * Checks if a path is an absolute path (Windows or Unix)
 */
export function isAbsolutePath(path: string): boolean {
    // Windows: C:\... or D:\...
    if (/^[A-Za-z]:[\\/]/.test(path)) {
        return true;
    }
    // Unix: /...
    if (path.startsWith('/')) {
        return true;
    }
    return false;
}

/**
 * Normalizes path separators to forward slashes
 */
export function normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
}

/**
 * Converts an absolute path to a vault-relative path
 * Returns null if the path is not within the vault
 */
export function absoluteToVaultRelative(vault: Vault, absolutePath: string): string | null {
    const vaultBase = normalizePath(getVaultBasePath(vault));
    const normalizedAbsolute = normalizePath(absolutePath);

    if (!vaultBase) {
        return null;
    }

    // Case-insensitive comparison for Windows
    const vaultBaseLower = vaultBase.toLowerCase();
    const absoluteLower = normalizedAbsolute.toLowerCase();

    // Check if the absolute path starts with the vault base
    if (absoluteLower.startsWith(vaultBaseLower)) {
        let relative = normalizedAbsolute.slice(vaultBase.length);
        // Remove leading slash
        if (relative.startsWith('/')) {
            relative = relative.slice(1);
        }
        return relative;
    }

    return null;
}

/**
 * Converts a vault-relative path to an absolute path
 */
export function vaultRelativeToAbsolute(vault: Vault, relativePath: string): string {
    const vaultBase = getVaultBasePath(vault);
    if (!vaultBase) {
        return relativePath;
    }
    return `${vaultBase}/${normalizePath(relativePath)}`;
}

/**
 * Resolves a path that could be either absolute or vault-relative
 * Returns the vault-relative path
 */
export function resolveToVaultRelative(vault: Vault, path: string): string | null {
    if (isAbsolutePath(path)) {
        return absoluteToVaultRelative(vault, path);
    }
    // Already vault-relative
    return path;
}
