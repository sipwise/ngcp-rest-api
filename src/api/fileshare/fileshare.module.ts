import {Module} from '@nestjs/common'
import {JournalModule} from '~/api/journals/journal.module'
import {FileshareController} from '~/api/fileshare/fileshare.controller'
import {FileshareService} from '~/api/fileshare/fileshare.service'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [JournalModule, ExpandModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
