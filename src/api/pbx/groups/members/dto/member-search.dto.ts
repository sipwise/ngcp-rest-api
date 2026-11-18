import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupMemberSearchDto {
    @ApiPropertyOptional({description: 'Subscriber of the member'})
        subscriber_id: number
    @ApiPropertyOptional({description: 'SIP username of the member'})
        username: string
    @ApiPropertyOptional({description: 'Extension of the member'})
        extension: string
    @ApiPropertyOptional({description: 'Domain of the member'})
        domain: string
    @ApiPropertyOptional({description: 'Id of the PBX group member'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'member_subquery.member_id',
        }
}