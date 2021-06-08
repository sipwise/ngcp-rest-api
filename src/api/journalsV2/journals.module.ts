import {Module} from '@nestjs/common'
import {journalsProviders} from './journals.providers'

@Module({
    providers: [...journalsProviders],
    exports: [...journalsProviders],
})
export class JournalsModule {
}
