import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupMemberSearchDto {
    @ApiPropertyOptional()
        subscriber_id: number
    @ApiPropertyOptional()
        username: string
    @ApiPropertyOptional()
        extension: string
    @ApiPropertyOptional()
        domain: string
    @ApiPropertyOptional()
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'member_subquery.member_id',
        }
}