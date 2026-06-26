export class RequestDtoOptions {
    id?: number
    setDefaults?: boolean
    assignNulls?: boolean
    parentId?: number
    overrideFields?: {[key: string]: unknown}
}
export abstract class RequestDto {
    toInternal?(options?: RequestDtoOptions): void;
}