import {Module} from '@nestjs/common'
import {PbxGroupService} from '~/api/pbx/groups/pbx-group.service'
import {PbxGroupController} from '~/api/pbx/groups/pbx-group.controller'
import {PbxGroupMariadbRepository} from '~/api/pbx/groups/repositories/pbx-group.mariadb.repository'

@Module({
    providers: [PbxGroupService, PbxGroupMariadbRepository],
    controllers: [PbxGroupController],
    exports: [PbxGroupService],
})
export class PbxGroupModule {
}
