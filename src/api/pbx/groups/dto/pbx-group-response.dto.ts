import {ApiProperty} from '@nestjs/swagger'
import {Type} from 'class-transformer'
import {IsInt, IsNumber, IsString} from 'class-validator'

import {internal} from '~/entities'
import {UrlReferenceType} from '~/enums/url-reference-type.enum'
import {UrlReference} from '~/types/url-reference.type'

export class PbxGroupResponseDto {
    @IsInt()
    @ApiProperty()
        customer_id: number

    @IsString()
    @ApiProperty()
        extension: string

    @IsString()
    @ApiProperty()
        hunt_policy: string

    @IsNumber()
    @ApiProperty()
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

    constructor(prefix:string, pbxGroup: internal.PbxGroup) {
        this.customer_id = pbxGroup.customerId
        this.extension = pbxGroup.extension
        this.hunt_policy = pbxGroup.huntPolicy
        this.hunt_timeout = pbxGroup.huntTimeout
        this.id = pbxGroup.id
        this.domain = pbxGroup.domain
        this.members = {
            type: UrlReferenceType.Link,
            url: prefix + '/' + pbxGroup.id + '/members',
        }
        this.name = pbxGroup.name
    }
}
