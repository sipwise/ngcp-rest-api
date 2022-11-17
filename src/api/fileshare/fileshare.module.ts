import {Module} from '@nestjs/common'
import {JournalModule} from '../journals/journal.module'
import {FileshareController} from './fileshare.controller'
import {FileshareService} from './fileshare.service'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalModule, ExpandModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
