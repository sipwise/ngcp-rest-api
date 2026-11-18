import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNotEmpty, IsString, ValidateNested} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {ResponseDtoOptions} from '~/types/response-dto-options'
import {UrlReference} from '~/types/url-reference.type'

export class RewriteRuleSetResponseDto extends ResponseDto {
    @IsInt()
    @ApiProperty({description: 'Id of the rewrite rule set'})
        id: number

    @IsInt()
    @ApiProperty({description: 'Reseller of the rewrite rule set; required for admin roles, the own reseller for reseller roles'})
        reseller_id: number

    @IsString()
    @IsNotEmpty()
    @ApiProperty({description: 'Name of the rewrite rule set'})
        name: string

    @CanBeNull()
    @IsString()
    @ApiProperty({description: 'Description of the rewrite rule set'})
        description?: string

    @ValidateNested()
    @Type(() => UrlReference)
    @ApiProperty({description: 'Rules of the set'})
        rules: UrlReference

    constructor(entity: internal.RewriteRuleSet, options?: ResponseDtoOptions) {
        super(options)
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.rules = {
            type: UrlReferenceType.Link,
            url: `${this.resourceUrl}/${entity.id}/rules`,

        }
    }
}