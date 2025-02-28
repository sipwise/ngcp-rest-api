import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'
import {Expandable} from 'decorators/expandable.decorator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'


export class ResellerResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty()
        id: number

    @IsInt()
    @ApiProperty()
    @Expandable({name: 'contract_id', controller: 'contractController'})
        contract_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
        name: string

    @IsEnum(ResellerStatus)
    @ApiProperty()
        status: ResellerStatus

    @Type(() => UrlReference)
    @ApiProperty()
        phonebook: UrlReference

    constructor(reseller: internal.Reseller, options?: ResponseDtoOptions) {
        super(options)
        this.id = reseller.id
        this.contract_id = reseller.contract_id
        this.name = reseller.name
        this.status = reseller.status
        this.phonebook = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${this.id}/phonebook`,
        }
    }
}
