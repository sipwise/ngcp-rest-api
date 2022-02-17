import {Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {FileshareController} from './fileshare.controller'
import {FileshareService} from './fileshare.service'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalsModule, ExpandModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
