import {Module} from '@nestjs/common'

import {PbxGroupController} from './group.controller'
import {PbxGroupService} from './group.service'
import {PbxGroupMariadbRepository} from './repositories/group.mariadb.repository'

@Module({
    providers: [PbxGroupService, PbxGroupMariadbRepository],
    controllers: [PbxGroupController],
    exports: [PbxGroupService],
})
export class PbxGroupModule {
}
