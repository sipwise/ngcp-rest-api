import {Module} from '@nestjs/common'

import {NumberController} from './number.controller'
import {NumberService} from './number.service'
import {NumberMariadbRepository} from './repositories/number.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'

@Module({

    imports: [
        JournalModule,
    ],
    controllers: [NumberController],
    providers: [
        NumberController,
        NumberService,
        NumberMariadbRepository,
    ],
})
export class NumberModule {
}
