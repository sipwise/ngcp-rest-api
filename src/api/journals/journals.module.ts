import {forwardRef, Module} from '@nestjs/common'
import {JournalsController} from './journals.controller'
import {JournalsService} from './journals.service'
import {ExpandModule} from '../../helpers/expand.module'
import {JournalsMariadbRepository} from './repositories/journals.mariadb.repository'

@Module({
    controllers: [JournalsController],
    imports: [
        //LoggingModule
        forwardRef(() => ExpandModule),
    ],
    providers: [
        JournalsService,
        JournalsMariadbRepository
    ],
    exports: [
        JournalsService,
        JournalsMariadbRepository
    ],
})
export class JournalsModule {
}
