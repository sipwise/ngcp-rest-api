import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEnum, IsNotEmpty, IsNumber, IsOptional, MaxLength} from 'class-validator'
import {RequestDto, RequestDtoOptions} from '../../../../../dto/request.dto'
import {internal} from '../../../../../entities'
import {HeaderRuleDirection} from 'entities/internal/header-rule.internal.entity'

export class HeaderManipulationRuleRequestDto implements RequestDto {

    @IsNotEmpty()
    @ApiProperty({description: 'Set id', example: '1'})
        set_id: number

    @IsNotEmpty()
    @ApiProperty({description: 'Rule name', example: 'Foo Rule'})
        name: string

    @IsOptional()
    @MaxLength(255)
    @ApiPropertyOptional({description: 'Rule description', example: 'Rule description'})
        description?: string

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty({description: 'Rule priority', example: 100})
        priority: number

    @IsNotEmpty()
    @IsEnum(HeaderRuleDirection)
    @ApiProperty({description: 'Rule direction', example: 'inbound'})
        direction: HeaderRuleDirection

    @IsNotEmpty()
    @ApiProperty({description: 'Rule stopper', example: false})
        stopper: boolean

    @IsNotEmpty()
    @ApiProperty({description: 'Rule enabled', example: true})
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
        entity.name = this.name
        entity.description = this.description
        entity.priority = this.priority
        entity.direction = this.direction
        entity.stopper = this.stopper
        entity.enabled = this.enabled
        if (options.id)
            entity.id = options.id
        return entity
    }
}
