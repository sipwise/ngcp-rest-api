export function paginate<T>(array: T[], rows: number, page: number): T[] {
    return array.slice((page - 1) * rows, page * rows)
}

