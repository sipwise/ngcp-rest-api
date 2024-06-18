import {Module} from '@nestjs/common'
import {PbxGroupMemberService} from './pbx-group-member.service'
import {PbxGroupMemberController} from './pbx-group-member.controller'
import {PbxGroupMemberMariadbRepository} from './repositories/pbx-group-member.mariadb.repository'

@Module({
    providers: [PbxGroupMemberService, PbxGroupMemberMariadbRepository],
    controllers: [PbxGroupMemberController],
    exports: [PbxGroupMemberService],
})
export class PbxGroupMemberModule {
}
