import {Module} from '@nestjs/common'

import {FileshareController} from './fileshare.controller'
import {FileshareService} from './fileshare.service'

import {JournalModule} from '~/api/journals/journal.module'

@Module({
    imports: [JournalModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
