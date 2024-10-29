import {Module,forwardRef} from '@nestjs/common'

import {NumberController} from './number.controller'
import {NumberService} from './number.service'
import {NumberMariadbRepository} from './repositories/number.mariadb.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({

    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
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
