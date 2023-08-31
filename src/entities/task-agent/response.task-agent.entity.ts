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
    data?: { [key: string]:  any }
}