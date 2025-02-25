import {Module} from '@nestjs/common'

import {PbxUserController} from './pbx-user.controller'
import {PbxUserService} from './pbx-user.service'
import {PbxUserMariadbRepository} from './repositories/pbx-user.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    providers: [PbxUserService, PbxUserMariadbRepository],
    controllers: [PbxUserController],
})
export class PbxUserModule {
}
