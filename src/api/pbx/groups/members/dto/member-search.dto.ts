import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class PbxGroupMemberSearchDto {
    @ApiPropertyOptional()
        subscriber_id: number = undefined
    @ApiPropertyOptional()
        username: string = undefined
    @ApiPropertyOptional()
        extension: string = undefined
    @ApiPropertyOptional()
        domain: string = undefined
    @ApiPropertyOptional()
        id: number = undefined
    @ApiHideProperty()
    _alias = {
        id: 'member_subquery.member_id',
    }
}