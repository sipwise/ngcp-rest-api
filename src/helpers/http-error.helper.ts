export function GenerateErrorMessageArray(ids: number[] | string[], message: string): string[] {
    return ids.map(id => `[${id}] ${message}`)
}