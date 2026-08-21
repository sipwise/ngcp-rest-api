import {Module} from '@nestjs/common'

import {PbxGroupMemberController} from './member.controller'
import {PbxGroupMemberService} from './member.service'
import {PbxGroupMemberMariadbRepository} from './repositories/member.mariadb.repository'

@Module({
    providers: [PbxGroupMemberService, PbxGroupMemberMariadbRepository],
    controllers: [PbxGroupMemberController],
    exports: [PbxGroupMemberService],
})
export class PbxGroupMemberModule {
}
