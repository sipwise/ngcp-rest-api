import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../api/journals/journals.module'
import {LoggerModule} from '../logger/logger.module'
import {LoggerService} from '../logger/logger.service'
import {JournalingInterceptor} from './journaling.interceptor'
import {LoggingInterceptor} from './logging.interceptor'
import {JournalsService} from '../api/journals/journals.service'

@Module({
    imports: [
        forwardRef(() => JournalsModule),
        LoggerModule
    ],
    providers: [JournalingInterceptor, LoggingInterceptor, LoggerService, JournalsService],
    exports: [JournalsModule, LoggerModule],
})
export class InterceptorModule {
}
