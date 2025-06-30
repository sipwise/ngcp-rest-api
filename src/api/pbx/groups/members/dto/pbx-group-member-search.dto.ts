export class PbxGroupMemberSearchDto {
    subscriber_id: number = undefined
    username: string = undefined
    extension: string = undefined
    domain: string = undefined
    _alias = {
        id: 'member_subquery.member_id',
    }
}