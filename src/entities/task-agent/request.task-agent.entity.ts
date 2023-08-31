export class Request {
    uuid: string
    task: string
    src: string
    dst: string
    timestamp?: number
    datetime?: string
    options?: { [key: string]: string | number }
    data?: { [key: string]: any }
}