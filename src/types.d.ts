declare module 'js-yaml' {
    export function load(str: string, opts?: Record<string, unknown>): unknown;
    export function dump(obj: unknown, opts?: Record<string, unknown>): string;
}
