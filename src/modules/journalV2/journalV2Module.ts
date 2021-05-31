import {Module} from '@nestjs/common'
import {journalProviders} from './journalV2.provider'

@Module({
    providers: [...journalProviders],
    exports: [...journalProviders],
})
export class JournalV2Module {
}
