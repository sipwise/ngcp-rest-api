import {Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors} from '@nestjs/common'
import {ApiCreatedResponse, ApiTags} from '@nestjs/swagger'
import {ContactsService} from './contacts.service'
import {ContactCreateDto} from './dto/contact-create.dto'
import {UpdateContactDto} from './dto/update-contact.dto'
import {Contact} from '../../entities/db/billing/contact.entity'
import {OmniGuard} from '../../guards/omni.guard'
import {LoggingInterceptor} from '../../interceptors/logging.interceptor'
import {JournalingInterceptor} from '../../interceptors/journaling.interceptor'
import {config} from '../../config/main.config'

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(OmniGuard)
@UseInterceptors(LoggingInterceptor, JournalingInterceptor)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) {
    }

    @Post()
    @ApiCreatedResponse({
        type: Contact,
    })
    async create(@Body() createContactDto: ContactCreateDto) {
        return await this.contactsService.create(createContactDto)
    }

    @Get()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${config.common.api_default_query_page}`
        row = row ? row : `${config.common.api_default_query_rows}`
        return await this.contactsService.readAll(page, row)
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.contactsService.read(+id)
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
        //return await this.contactsService.update(+id, updateContactDto)
        return
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.contactsService.delete(+id)
    }
}
