export class Request {
    uuid: string
    task: string
    src: string
    dst: string
    timestamp?: number
    datetime?: string
    options?: { [key: string]: string | number }
    // TODO: When task agent defines the type change 'any' to the correct type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
}