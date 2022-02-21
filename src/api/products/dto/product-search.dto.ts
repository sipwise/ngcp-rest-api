import {ProductResponseDto} from './product-response.dto'

export class ProductSearchDto implements ProductResponseDto {
    id: number = undefined
    class: string = undefined
    handle: string = undefined
    name : string = undefined
}
