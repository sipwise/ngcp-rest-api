export class RequestDtoOptions {
    id?: number
    setDefaults?: boolean
    assignNulls?: boolean
    parentId?: number
}
export abstract class RequestDto {
    toInternal?(options?: RequestDtoOptions): void;
}