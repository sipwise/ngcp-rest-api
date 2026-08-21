import {Module} from '@nestjs/common'

import {PbxUserController} from './user.controller'
import {PbxUserService} from './user.service'
import {PbxUserMariadbRepository} from './repositories/user.mariadb.repository'

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
