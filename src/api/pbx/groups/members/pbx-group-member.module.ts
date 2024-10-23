import {Module} from '@nestjs/common'
import {PbxGroupMemberService} from '~/api/pbx/groups/members/pbx-group-member.service'
import {PbxGroupMemberController} from '~/api/pbx/groups/members/pbx-group-member.controller'
import {PbxGroupMemberMariadbRepository} from '~/api/pbx/groups/members/repositories/pbx-group-member.mariadb.repository'

@Module({
    providers: [PbxGroupMemberService, PbxGroupMemberMariadbRepository],
    controllers: [PbxGroupMemberController],
    exports: [PbxGroupMemberService],
})
export class PbxGroupMemberModule {
}
