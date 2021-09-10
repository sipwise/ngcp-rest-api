import {Module} from '@nestjs/common'
import {ResellerbrandinglogosService} from './resellerbrandinglogos.service'
import {ResellerbrandinglogosController} from './resellerbrandinglogos.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [ResellerbrandinglogosService],
    controllers: [ResellerbrandinglogosController],
})
export class ResellerbrandinglogosModule {
}
