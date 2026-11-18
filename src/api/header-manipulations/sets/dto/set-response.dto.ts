import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class HeaderManipulationSetResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the header rule set'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller of the header rule set'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the header rule set'})
        name: string

    @CanBeNull()
    @IsInt()
    @ApiProperty({description: 'Subscriber the set belongs to; null = reseller-wide set'})
        subscriber_id?: number

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Description of the header rule set'})
        description: string

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the rules of the set'})
        rules: UrlReference

    constructor(entity: internal.HeaderRuleSet, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.subscriber_id = entity.subscriberId
        this.rules = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/rules`,
        }
    }
}