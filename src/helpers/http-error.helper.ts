export function GenerateErrorMessageArray(ids: number[], message: string): string[] {
    return ids.map(id => `[${id}] ${message}`)
}