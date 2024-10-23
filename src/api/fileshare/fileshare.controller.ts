import {ApiConsumes, ApiOkResponse, ApiQuery, ApiTags} from '@nestjs/swagger'
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    Response,
    StreamableFile,
    UnprocessableEntityException,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {FileshareRequestDto} from './dto/fileshare-request.dto'
import {FileshareResponseDto} from './dto/fileshare-response.dto'
import {FileshareService} from './fileshare.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalService} from '../journals/journal.service'
import {Public} from '../../decorators/public.decorator'
import {FileInterceptor} from '@nestjs/platform-express'
import {AppService} from '../../app.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {FileshareSearchDto} from './dto/fileshare-search.dto'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {ApiCreatedResponse} from '../../decorators/api-created-response.decorator'
import {ApiPaginatedResponse} from '../../decorators/api-paginated-response.decorator'
import {LoggerService} from '../../logger/logger.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ParseUUIDArrayPipe} from '../../pipes/parse-uuid-array.pipe'
import {ParamOrBody} from '../../decorators/param-or-body.decorator'

const resourceName = 'fileshare'

@ApiTags('Fileshare')
@Controller(resourceName)
export class FileshareController extends CrudController<FileshareRequestDto, FileshareResponseDto> {
    private readonly log = new LoggerService(FileshareController.name)

    constructor(
        private readonly fileshareService: FileshareService,
        private readonly journalService: JournalService,
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, fileshareService, journalService)
    }

    @Post()
    @ApiConsumes('multipart/form-data')
    @ApiCreatedResponse(FileshareResponseDto)
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null,
        },
    }))
    async createFile(
        @Body() createDto: FileshareRequestDto,
        @Req() req,
        @UploadedFile() file,
    ): Promise<FileshareResponseDto> {
        if (!file) {
            throw new UnprocessableEntityException()
        }
        this.log.debug({message: 'create fileshare', func: this.create.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const response = await this.fileshareService.create(createDto, sr, file)
        await this.journalService.writeJournal(sr, 0, response)
        return response
    }

    @Get()
    @ApiQuery({type: SearchLogic})
    @ApiPaginatedResponse(FileshareResponseDto)
    async readAll(@Req() req): Promise<[FileshareResponseDto[], number]> {
        this.log.debug({message: 'fetch all fileshares', func: this.readAll.name, url: req.url, method: req.method})
        const sr = new ServiceRequest(req)
        const [responseList, totalCount] =
            await this.fileshareService.readAll(sr)
        if (req.query.expand) {
            const fileshareSearchDtoKeys = Object.keys(new FileshareSearchDto())
            await this.expander.expandObjects(responseList, fileshareSearchDtoKeys, sr)
        }
        return [responseList, totalCount]
    }

    @Public(AppService.config.fileshare.public_links)
    @Get(':id')
    @ApiOkResponse({
        type: StreamableFile,
    })
    async readFile(
        @Param('id') id: string,
        @Req() req,
        @Response({passthrough: true}) res,
    ): Promise<StreamableFile> {
        this.log.debug({message: 'fetch fileshare by id', func: this.readFile.name, url: req.url, method: req.method})
        const stream = await this.fileshareService.read(id)
        let size = 0
        stream.options.disposition.split(/;\s*/).map(pair => {
            const p = pair.split('=')
            if (p[0] && p[0] == 'size' && p[1])
                size = Number(p[1])
        })

        res.set({
            ...(size > 0 && {'Content-Length': size}),
            'Content-Type': stream.options.type,
            'Content-Disposition': stream.options.disposition,
        })
        res.passthrough = true

        return stream
    }

    @Delete(':id?')
    @ApiOkResponse({})
    async delete(
        @ParamOrBody('id', new ParseUUIDArrayPipe()) ids: string[],
        @Req() req,
    ): Promise<string[]>{
        this.log.debug({message: 'delete fileshare by id', func: this.delete.name, url: req.url, method: req.method})

        const sr = new ServiceRequest(req)
        const deletedIds = await this.fileshareService.delete(ids, sr)
        for (const deletedId of deletedIds) {
            await this.journalService.writeJournal(sr, 0, deletedId)
        }
        return deletedIds
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(
        @Param('id') id: number | string,
        @Req() req,
    ): Promise<[JournalResponseDto[], number]> {
        this.log.debug({message: 'fetch fileshare journal by id', func: this.journal.name, url: req.url, method: req.method})
        return super.journal(id, req)
    }

}
