import {ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Controller, Delete, Get, Param, ParseUUIDPipe, Post, Response, StreamableFile, UseInterceptors} from '@nestjs/common'
import {CrudController} from '../../controllers/crud.controller'
import {FileshareCreateDto} from './dto/fileshare-create.dto'
import {FileshareResponseDto} from './dto/fileshare-response.dto'
import {FileshareService} from './fileshare.service'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'
import {JournalsService} from '../journals/journals.service'
import {Public} from '../../decorators/public.decorator'
import {FileInterceptor} from '@nestjs/platform-express'
import {AppService} from '../../app.service'

const resourceName = 'fileshare'

@ApiTags('Fileshare')
@Controller(resourceName)
export class FileshareController extends CrudController<FileshareCreateDto, FileshareResponseDto> {
    constructor(
        private readonly fileshareService: FileshareService,
        private readonly journalsService: JournalsService,
    ) {
        super(resourceName, fileshareService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: FileshareResponseDto,
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: AppService.config.fileshare.limits.upload_size || null
        }
    }))
    async create(createDto: FileshareCreateDto, req, file): Promise<FileshareResponseDto> {
        return await this.fileshareService.create(createDto, req, file)
    }

    @Get()
    @ApiOkResponse({
        type: [FileshareResponseDto],
    })
    async readAll(page, row, req): Promise<FileshareResponseDto[]> {
        return this.fileshareService.readAll(page, row, req)
    }

    @Public(AppService.config.fileshare.public_links)
    @Get(':id')
    @ApiOkResponse({
        type: StreamableFile
    })
    async readFile(@Param('id', ParseUUIDPipe) id: string, req, @Response({passthrough: true}) res): Promise<StreamableFile> {
        const stream = await this.fileshareService.read(id)
        let size = 0
        stream.options.disposition.split(/;\s*/).map(pair => {
            let p = pair.split('=')
            if (p[0] && p[0] == 'size' && p[1])
                size = Number(p[1])
        })

        res.set({
            ...(size > 0 && {'Content-Length': size}),
            'Content-Type': stream.options.type,
            'Content-Disposition': stream.options.disposition
        })
        res.passthrough = true

        return stream
    }

    @Delete(':id')
    @ApiOkResponse({})
    async delete(@Param('id', ParseUUIDPipe) id: string, req) {
        return this.fileshareService.delete(id, req)
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(id, page, row, req): Promise<JournalResponseDto[]> {
        return super.journal(id, page, row, req)
    }

}
