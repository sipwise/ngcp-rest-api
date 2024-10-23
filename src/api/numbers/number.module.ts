import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {NumberController} from '~/api/numbers/number.controller'
import {NumberService} from '~/api/numbers/number.service'
import {NumberMariadbRepository} from '~/api/numbers/repositories/number.mariadb.repository'

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
