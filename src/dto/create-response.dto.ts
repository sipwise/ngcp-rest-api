export class CreateResponseDto<TData> {
    total_count: number
    data?: TData[]
    links?: string[]
    ids?: string[]
}
