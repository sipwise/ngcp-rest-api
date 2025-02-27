import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsEnum, IsInt, IsNotEmpty, IsString} from 'class-validator'
import {Expandable} from 'decorators/expandable.decorator'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'


export class ResellerResponseDto implements ResponseDto {
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

    constructor(reseller: internal.Reseller, url: string) {
        this.id = reseller.id
        this.contract_id = reseller.contract_id
        this.name = reseller.name
        this.status = reseller.status
        this.phonebook = {
            type: UrlReferenceType.Link,
            url: `${url}/${this.id}/phonebook`,
        }
    }
}
