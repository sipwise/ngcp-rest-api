import { Module } from '@nestjs/common';
import { PbxgroupsService } from './pbxgroups.service';
import { PbxgroupsController } from './pbxgroups.controller';
import {PbxgroupsMariadbRepository} from './repositories/pbxgroups.mariadb.repository'

@Module({
  providers: [PbxgroupsService, PbxgroupsMariadbRepository],
  controllers: [PbxgroupsController],
  exports: [PbxgroupsService]
})
export class PbxgroupsModule {}
