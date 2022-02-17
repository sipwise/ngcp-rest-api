import {ProductsResponseDto} from './products-response.dto'

export class ProductSearchDto implements ProductsResponseDto {
    id: number = undefined
    class: string = undefined
    handle: string = undefined
    name : string = undefined
}
