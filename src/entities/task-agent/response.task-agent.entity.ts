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
    // TODO: Fix any type, can we use unknown or never here?
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: { [key: string]:  any }
}