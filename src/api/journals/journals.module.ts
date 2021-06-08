import {Module} from '@nestjs/common'
import {journalsProviders} from './journals.providers'
import {JournalsController} from './journals.controller'

@Module({
    controllers: [JournalsController],
    imports: [
        //LoggingModule
    ],
    providers: [...journalsProviders],
    exports: [...journalsProviders],
})

export class JournalsModule {
}
