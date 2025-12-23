declare module 'js-yaml' {
    export function load(str: string, opts?: any): any;
    export function dump(obj: any, opts?: any): string;
}
