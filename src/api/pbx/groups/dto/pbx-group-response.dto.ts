import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNumber, IsOptional, IsString} from 'class-validator'

import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class PbxGroupResponseDto {
    @IsInt()
    @ApiProperty()
        customer_id: number

    @IsOptional()
    @IsString()
    @ApiProperty({nullable: true})
        extension: string

    @IsOptional()
    @IsString()
    @ApiProperty({nullable: true})
        hunt_policy: string

    @IsOptional()
    @IsNumber()
    @ApiProperty({nullable: true})
        hunt_timeout: number

    @IsInt()
    @ApiProperty()
        id: number

    @Type(() => UrlReference)
    @ApiProperty()
        members: UrlReference

    @IsString()
    @ApiProperty()
        name: string

    @IsString()
    @ApiProperty()
        domain: string

    constructor(url:string, pbxGroup: internal.PbxGroup) {
        this.customer_id = pbxGroup.customerId
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.id = pbxGroup.id
        this.domain = pbxGroup.domain
        this.members = {
            type: UrlReferenceType.Link,
            url: `${url}/${pbxGroup.id}/members`,
        }
        this.name = pbxGroup.name
    }
}
