import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {ExpandModule} from '../../helpers/expand.module'
import {NumberController} from './number.controller'
import {NumberService} from './number.service'
import {NumberMariadbRepository} from './repositories/number.mariadb.repository'

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
