import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'
import {OneOf} from 'decorators/one-of.decorator'

import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'
import {HeaderRuleDirection} from '~/entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleRequestDto implements RequestDto {

    @OneOf('subscriber_id')
    @ApiProperty({description: 'Header rule set of the rule', example: '1'})
        set_id?: number

    @OneOf('set_id')
    @ApiProperty({description: 'Subscriber of the header rule set; creates a subscriber set when given instead of set_id', example: '1'})
        subscriber_id?: number

    @IsNotEmpty()
    @ApiProperty({description: 'Name of the rule', example: 'Foo Rule'})
        name: string

    @IsOptional()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Description of the rule', example: 'Rule description'})
        description?: string

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'Priority of the rule; lower values are processed first', example: 100})
        priority: number

    @IsNotEmpty()
    @IsEnum(HeaderRuleDirection)
    @ApiProperty({description: 'Call leg and direction the rule applies to', example: 'a_inbound'})
        direction: HeaderRuleDirection

    @IsNotEmpty()
    @ApiProperty({description: 'No further rules are processed when this rule matches', example: false})
        stopper: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Rule is enabled', example: true})
        enabled: boolean

    constructor(entity?: internal.HeaderRule) {
        if (!entity)
            return
        this.set_id = entity.setId
        this.name = entity.name
        this.description = entity.description
        this.priority = entity.priority
        this.direction = entity.direction
        this.stopper = entity.stopper
        this.enabled = entity.enabled
    }

    toInternal(options: RequestDtoOptions = {}): internal.HeaderRule {
        const entity = new internal.HeaderRule()
        entity.setId = this.set_id
        entity.subscriberId = this.subscriber_id
        entity.name = this.name
        entity.description = this.description
        entity.priority = this.priority
        entity.direction = this.direction
        entity.stopper = this.stopper
        entity.enabled = this.enabled
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
