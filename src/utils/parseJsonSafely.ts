export function parseJsonSafely<T = any>(json: any): T | null {
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}
