import {forwardRef, Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {LoggerModule} from '~/logger/logger.module'
import {LoggerService} from '~/logger/logger.service'
import {LoggingInterceptor} from '~/interceptors/logging.interceptor'
import {JournalService} from '~/api/journals/journal.service'

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
