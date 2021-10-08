import {Controller, Get} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {RBAC_ROLES} from '../../config/constants.config'
import {CrudController} from '../../controllers/crud.controller'
import {ResellerbrandinglogoCreateDto} from './dto/resellerbrandinglogo-create.dto'
import {ResellerbrandinglogoResponseDto} from './dto/resellerbrandinglogo-response.dto'
import {JournalsService} from '../journals/journals.service'
import {ResellerbrandinglogosService} from './resellerbrandinglogos.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'

const resourceName = 'resellerbrandinglogos'

@Auth(RBAC_ROLES.system)
@Controller(resourceName)
@ApiTags(' Reseller branding logos')
export class ResellerbrandinglogosController extends CrudController<ResellerbrandinglogoCreateDto, ResellerbrandinglogoResponseDto> {

    constructor(
        private readonly brandingService: ResellerbrandinglogosService,
        private readonly journalService: JournalsService,
    ) {
        super(resourceName, brandingService, journalService)
    }

    @Get()
    @ApiOkResponse({
        type: [ResellerbrandinglogoResponseDto],
    })
    async readAll(page, rows, req): Promise<ResellerbrandinglogoResponseDto[]> {
        return super.readAll(page, rows, req)
    }

    @Get(':id')
    @ApiOkResponse({
        type: ResellerbrandinglogoResponseDto,
    })
    async read(id, req): Promise<ResellerbrandinglogoResponseDto> {
        return super.read(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id: number, page: number, row: number): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row)
    }
}
