import {
    Controller,
    Delete,
    forwardRef,
    Get,
    Inject,
    Logger,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
} from '@nestjs/common'
import {Auth} from '../../decorators/auth.decorator'
import {RbacRole} from '../../config/constants.config'
import {ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {CrudController} from '../../controllers/crud.controller'
import {JournalsService} from '../journals/journals.service'
import {ExpandHelper} from '../../helpers/expand.helper'
import {Request} from 'express'
import {number} from 'yargs'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {PatchDto} from '../patch.dto'
import {Operation} from '../../helpers/patch.helper'
import {ContactsService} from './contacts.service'
import {ContactCreateDto} from './dto/contact-create.dto'
import {ContactResponseDto} from './dto/contact-response.dto'
import {ContactSearchDto} from './dto/contact-search.dto'
import {JournalResponseDto} from '../journals/dto/journal-response.dto'

const resourceName = 'contacts'

@Auth(RbacRole.system, RbacRole.admin, RbacRole.ccareadmin)
@ApiTags('Contacts')
@Controller(resourceName)
export class ContactsController extends CrudController<ContactCreateDto, ContactResponseDto> {
    private readonly log = new Logger(ContactsController.name)

    constructor(
        private readonly contactsService: ContactsService,
        private readonly journalsService: JournalsService,
        @Inject(forwardRef(() => ExpandHelper))
        private readonly expander: ExpandHelper,
    ) {
        super(resourceName, contactsService, journalsService)
    }

    @Post()
    @ApiCreatedResponse({
        type: ContactResponseDto,
    })
    async create(entity: ContactCreateDto, req: Request): Promise<ContactResponseDto> {
        this.log.debug({message: 'create contact', func: this.create.name, url: req.url, method: req.method})
        const sr = this.newServiceRequest(req)
        const contact = await this.contactsService.create(entity.toInternal(), sr)
        const response = new ContactResponseDto(contact, sr.user.role)
        await this.journalsService.writeJournal(sr, response.id, response)
        return response
    }

    @Get()
    @ApiOkResponse({
        type: [ContactResponseDto],
    })
    async readAll(@Req() req): Promise<[ContactResponseDto[], number]> {
        this.log.debug({
            message: 'fetch all contacts',
            func: this.readAll.name,
            url: req.url,
            method: req.method,
        })
        const sr: ServiceRequest = this.newServiceRequest(req)
        const [contacts, count] = await this.contactsService.readAll(sr)
        const responseList = contacts.map(contact => new ContactResponseDto(contact, sr.user.role))
        if (req.query.expand) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects(responseList, contactSearchDtoKeys, sr)
        }
        return [responseList, count]
    }

    @Get(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async read(@Param('id', ParseIntPipe) id: number, req): Promise<ContactResponseDto> {
        const sr = this.newServiceRequest(req)
        const contact = await this.contactsService.read(id, sr)
        const responseItem = new ContactResponseDto(contact, sr.user.role)
        if (req.query.expand && !req.isRedirected) {
            const contactSearchDtoKeys = Object.keys(new ContactSearchDto())
            await this.expander.expandObjects(responseItem, contactSearchDtoKeys, sr)
        }
        return responseItem
    }

    @Patch(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    @ApiBody({
        type: [PatchDto],
    })
    async adjust(@Param('id', ParseIntPipe) id: number, patch: Operation | Operation[], req): Promise<ContactResponseDto> {
        // return this.contactsService.adjust(id, patch, this.newServiceRequest(req))
        return
    }

    @Put(':id')
    @ApiOkResponse({
        type: ContactResponseDto,
    })
    async update(@Param('id', ParseIntPipe) id: number, entity: ContactCreateDto, req): Promise<ContactResponseDto> {
        //return this.contactsService.update(id, entity, this.newServiceRequest(req))
        return
    }

    @Delete(':id')
    @ApiOkResponse({
        type: number,
    })
    async delete(@Param('id', ParseIntPipe) id: number, req): Promise<number> {
        return this.contactsService.delete(id, this.newServiceRequest(req))
    }

    @Get(':id/journal')
    @ApiOkResponse({
        type: [JournalResponseDto],
    })
    async journal(@Param('id') id: number | string, @Req() req) {
        this.log.debug({
            message: 'fetch customer contact journal by id',
            func: this.journal.name,
            url: req.url,
            method: req.method,
        })
        return super.journal(id, req)
    }
}
