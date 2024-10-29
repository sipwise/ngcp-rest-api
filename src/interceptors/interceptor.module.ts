import {Module,forwardRef} from '@nestjs/common'

import {LoggingInterceptor} from './logging.interceptor'

import {JournalModule} from '~/api/journals/journal.module'
import {JournalService} from '~/api/journals/journal.service'
import {LoggerModule} from '~/logger/logger.module'
import {LoggerService} from '~/logger/logger.service'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        LoggerModule,
    ],
    providers: [LoggingInterceptor, LoggerService, JournalService],
    exports: [JournalModule, LoggerModule],
})
export class InterceptorModule {
}
