import {Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {FileshareController} from './fileshare.controller'
import {FileshareService} from './fileshare.service'

@Module({
    imports: [JournalsModule],
    controllers: [FileshareController],
    providers: [FileshareService],
})
export class FileshareModule {
}
