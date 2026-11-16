import {Module} from '@nestjs/common'

import {BanAdminController} from './admin.controller'
import {BanAdminService} from './admin.service'
import {BanAdminMariadbRepository} from './repositories/admin.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [
        JournalModule,
    ],
    providers: [BanAdminService, BanAdminMariadbRepository],
    controllers: [BanAdminController],
})
export class BanAdminModule {
}
