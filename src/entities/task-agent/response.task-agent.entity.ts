export class Response {
    uuid: string
    ref: string
    task: string
    src: string
    dst: string
    timestamp: number
    datetime: string
    chunk: number
    chunks: number
    status: string
    reason?: string
    // TODO: When task agent defines the type change 'any' to the correct type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
}