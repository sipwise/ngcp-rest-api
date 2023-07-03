import {RequestDto} from '../../../dto/request.dto'

export class FileshareRequestDto implements RequestDto {
    ttl?: number

    toInternal?(): void;
}
