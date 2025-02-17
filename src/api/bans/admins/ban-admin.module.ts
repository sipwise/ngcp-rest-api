import {Module,forwardRef} from '@nestjs/common'

import {BanAdminController} from './ban-admin.controller'
import {BanAdminService} from './ban-admin.service'
import {BanAdminMariadbRepository} from './repositories/ban-admin.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [BanAdminService, BanAdminMariadbRepository],
    controllers: [BanAdminController],
})
export class BanAdminModule {
}
