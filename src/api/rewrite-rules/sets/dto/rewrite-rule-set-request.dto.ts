import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength, ValidateNested} from 'class-validator'

import {RewriteRuleEmbeddedRequestDto} from '~/api/rewrite-rules/sets/rules/dto/rewrite-rule-embedded-request.dto'
import {RequestDto, RequestDtoOptions} from '~/dto/request.dto'
import {internal} from '~/entities'

export class RewriteRuleSetRequestDto implements RequestDto {
    @ApiProperty({description: 'Reseller Id', example: 1})
    @IsPositive()
    @IsInt()
        reseller_id!: number

    @ApiProperty({description: 'Rule set name', example: 'Restricted destinations'})
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
        name!: string

    @ApiPropertyOptional({description: 'Rule set description', example: 'Block calls to restricted destinations'})
    @IsOptional()
    @IsString()
        description?: string

    @ApiPropertyOptional({description: 'Rule set rules', example: []})
    @IsOptional()
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => RewriteRuleEmbeddedRequestDto)
        rules?: RewriteRuleEmbeddedRequestDto[]

    constructor(entity?: internal.RewriteRuleSet) {
        if (!entity)
            return
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
    }

    toInternal(options: RequestDtoOptions = {}): internal.RewriteRuleSet {
        const entity = new internal.RewriteRuleSet()
        entity.resellerId = this.reseller_id
        entity.name = this.name
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
