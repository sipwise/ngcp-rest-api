export function isInfiniteFuture(date: Date): boolean {
    return date.getFullYear() >= 9999
}

export function truncateToDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function toLocalDateTime(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
