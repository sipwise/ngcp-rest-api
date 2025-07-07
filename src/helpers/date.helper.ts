export function isInfiniteFuture(date: Date): boolean {
    return date.getFullYear() >= 9999
}

export function truncateToDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
