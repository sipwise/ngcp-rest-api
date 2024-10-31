export class Request {
    uuid: string
    task: string
    src: string
    dst: string
    timestamp?: number
    datetime?: string
    options?: { [key: string]: string | number }
    // TODO: Fix any type, can we use unknown or never here?
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: { [key: string]: any }
}