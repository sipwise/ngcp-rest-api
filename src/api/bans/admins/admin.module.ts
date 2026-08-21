import {Module,forwardRef} from '@nestjs/common'

import {BanAdminController} from './admin.controller'
import {BanAdminService} from './admin.service'
import {BanAdminMariadbRepository} from './repositories/admin.mariadb.repository'

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
