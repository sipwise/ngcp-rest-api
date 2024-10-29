import {Module} from '@nestjs/common'

import {PbxGroupMemberController} from './pbx-group-member.controller'
import {PbxGroupMemberService} from './pbx-group-member.service'
import {PbxGroupMemberMariadbRepository} from './repositories/pbx-group-member.mariadb.repository'

@Module({
    providers: [PbxGroupMemberService, PbxGroupMemberMariadbRepository],
    controllers: [PbxGroupMemberController],
    exports: [PbxGroupMemberService],
})
export class PbxGroupMemberModule {
}
