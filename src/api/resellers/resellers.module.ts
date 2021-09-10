import {Module} from '@nestjs/common'
import {ResellersService} from './resellers.service'
import {ResellersController} from './resellers.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [ResellersService],
    controllers: [ResellersController],
})
export class ResellersModule {
}
