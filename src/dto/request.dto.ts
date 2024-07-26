export class RequestDtoOptions {
    id?: number
    setDefaults?: boolean
    assignNulls?: boolean
}
export abstract class RequestDto {
    toInternal?(options?: RequestDtoOptions): void;
}