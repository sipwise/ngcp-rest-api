export function isInfiniteFuture(date: Date): boolean {
    return date.getFullYear() >= 9999
}

export function truncateToDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function validDateOrNull(date?: Date | null): Date | null {
    return date instanceof Date && !isNaN(date.getTime()) ? date : null
}
