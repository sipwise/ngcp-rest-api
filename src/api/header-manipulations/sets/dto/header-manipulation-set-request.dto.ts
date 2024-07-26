import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsNotEmpty, IsOptional} from 'class-validator'
import {RequestDto, RequestDtoOptions} from '../../../../dto/request.dto'
import {internal} from '../../../../entities'

export class HeaderManipulationSetRequestDto implements RequestDto {
    @IsOptional()
    @ApiPropertyOptional({description: 'Reseller Id', example: 1})
        reseller_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Rule set name', example: 'Restricted destinations'})
        name: string

    @IsOptional()
    @ApiPropertyOptional({description: 'Subscriber Id', example: 1})
        subscriber_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Rule set description', example: 'Block calls to restricted destinations'})
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
