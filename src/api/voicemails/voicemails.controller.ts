import {
    ApiBody,
    ApiConsumes,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger'
import {Auth} from '../../decorators/auth.decorator'
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseInterceptors,
} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {JournalsService} from '../journals/journals.service'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {number} from 'yargs'
import {Operation as PatchOperation, validate} from '../../helpers/patch.helper'
import {PatchDto} from '../patch.dto'
import {RBAC_ROLES} from '../../config/constants.config'
import {VoicemailBaseDto} from './dto/voicemail-base.dto'
import {VoicemailResponseDto} from './dto/voicemail-response.dto'
import {VoicemailsService} from './voicemails.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {VoicemailSearchDto} from './dto/voicemail-search.dto'
import {PaginatedDto} from '../paginated.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'

const resourceName = 'voicemails'

@Auth(RBAC_ROLES.admin, RBAC_ROLES.system, RBAC_ROLES.reseller, RBAC_ROLES.lintercept)
@UseInterceptors(LoggingInterceptor, new JournalingInterceptor(new JournalsService()))
@ApiTags('Voicemails')
@ApiExtraModels(PaginatedDto)
@Controller(resourceName)
export class VoicemailsController extends CrudController<VoicemailBaseDto, VoicemailResponseDto> {
    constructor(
        private readonly voicemailsService: VoicemailsService,
        private readonly journalService: JournalsService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, voicemailsService, journalService)
    }

    @Post()
    @ApiCreatedResponse({
        type: VoicemailResponseDto,
    })
    async create(@Body() voicemail: VoicemailBaseDto, @Req() req): Promise<VoicemailResponseDto> {
        return await this.voicemailsService.create(voicemail, req)
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(VoicemailResponseDto)
    async readAll(@Req() req): Promise<[VoicemailResponseDto[], number]> {
        const [responseList, totalCount] =
            await this.voicemailsService.readAll(req)
        if (req.query.expand) {
            const voicemailSearchDtoKeys = Object.keys(new VoicemailSearchDto())
            await this.expander.expandObjects(responseList, voicemailSearchDtoKeys, req)
        }
        return [responseList, totalCount]
    }

    @Get(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<VoicemailResponseDto> {
        const responseItem = await this.voicemailsService.read(id, req)
        if (req.query.expand && !req.isRedirected) {
            const voicemailSearchDtoKeys = Object.keys(new VoicemailSearchDto())
            await this.expander.expandObjects(responseItem, voicemailSearchDtoKeys, req)
        }
        return responseItem
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, @Req() req): Promise<number> {
        return await this.voicemailsService.delete(id, req)
    }

    @Patch(':id')
    @ApiConsumes('application/json-patch+json')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, @Body() patch: PatchOperation | PatchOperation[], @Req() req): Promise<VoicemailResponseDto> {
        const err = validate(patch)
        if (err) {
            const message = err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\'')
            throw new BadRequestException(message)
        }
        return await this.voicemailsService.adjust(id, patch, req)
    }

    @Put(':id')
    @ApiOkResponse({
        type: VoicemailResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, @Body() voicemail: VoicemailBaseDto, @Req() req): Promise<VoicemailResponseDto> {
        return await this.voicemailsService.update(id, voicemail, req)
    }
}
