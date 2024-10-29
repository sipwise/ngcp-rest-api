import {Module} from '@nestjs/common'

import {FileshareController} from './fileshare.controller'
import {FileshareService} from './fileshare.service'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [JournalModule, ExpandModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
