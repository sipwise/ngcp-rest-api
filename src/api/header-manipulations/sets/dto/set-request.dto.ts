import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsInt, IsNotEmpty, IsOptional, IsPositive} from 'class-validator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class HeaderManipulationSetRequestDto implements RequestDto {
    @ApiPropertyOptional({
        description: 'Reseller of the header rule set; required for admin roles, the own reseller for reseller roles',
        example: 1,
    })
    @IsOptional()
    @IsPositive()
    @IsInt()
        reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Name of the header rule set', example: 'Restricted destinations'})
        name: string

    @IsOptional()
    @ApiPropertyOptional({description: 'Subscriber the set belongs to; null = reseller-wide set', example: 1})
        subscriber_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Description of the header rule set', example: 'Block calls to restricted destinations'})
        description: string


    constructor(entity?: internal.HeaderRuleSet) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.subscriber_id = entity.subscriberId
        this.description = entity.description
    }

    toInternal(options: RequestDtoOptions = {}): internal.HeaderRuleSet {
        const entity = new internal.HeaderRuleSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.subscriberId = this.subscriber_id
        entity.description = this.description
        if (options.id)
            entity.id = options.id

        if (options.assignNulls) {
            Object.keys(entity).forEach(k => {
                if (entity[k] === undefined)
                    entity[k] = null
            })
        }
        return entity
    }
}
