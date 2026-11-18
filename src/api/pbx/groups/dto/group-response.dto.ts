import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNumber, IsOptional, IsString} from 'class-validator'

import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class PbxGroupResponseDto {
    @IsInt()
    @ApiProperty({description: 'PBX customer of the group'})
        customer_id: number

    @IsOptional()
    @IsString()
    @ApiProperty({description: 'Extension of the group', nullable: true})
        extension: string

    @IsOptional()
    @IsString()
    @ApiProperty({description: 'Hunting policy of the group', nullable: true})
        hunt_policy: string

    @IsOptional()
    @IsNumber()
    @ApiProperty({description: 'Hunting timeout in seconds', nullable: true})
        hunt_timeout: number

    @IsInt()
    @ApiProperty({description: 'Id of the PBX group'})
        id: number

    @Type(() => UrlReference)
    @ApiProperty({description: 'Link to the members of the group'})
        members: UrlReference

    @IsString()
    @ApiProperty({description: 'Display name of the group'})
        name: string

    @IsString()
    @ApiProperty({description: 'Domain of the group'})
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
