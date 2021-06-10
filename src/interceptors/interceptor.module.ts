import {Module} from '@nestjs/common'
import {JournalingInterceptor} from './journaling.interceptor'
import {JournalsModule} from '../api/journals/journals.module'
import {LoggingInterceptor} from './logging.interceptor'
import {LoggerModule} from '../logger/logger.module'
import {LoggerService} from '../logger/logger.service'

@Module({
    imports: [JournalsModule, LoggerModule],
    providers: [JournalingInterceptor, LoggingInterceptor, LoggerService],
    exports: [JournalsModule, LoggerModule],
})
export class InterceptorModule {
}
