import {Module} from '@nestjs/common'

import {PbxGroupController} from './pbx-group.controller'
import {PbxGroupService} from './pbx-group.service'
import {PbxGroupMariadbRepository} from './repositories/pbx-group.mariadb.repository'

@Module({
    providers: [PbxGroupService, PbxGroupMariadbRepository],
    controllers: [PbxGroupController],
    exports: [PbxGroupService],
})
export class PbxGroupModule {
}
