export class RequestDtoOptions {
    id?: number
    setDefaults?: boolean
}
export abstract class RequestDto {
    toInternal?(options?: RequestDtoOptions): void;
}