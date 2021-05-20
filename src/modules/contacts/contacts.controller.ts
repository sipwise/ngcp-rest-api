import {Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors} from '@nestjs/common';
import {ApiCreatedResponse, ApiTags} from '@nestjs/swagger';
import {ContactsService} from './contacts.service';
import {CreateContactDto} from './dto/create-contact.dto';
import {UpdateContactDto} from './dto/update-contact.dto';
import {Contact} from './contact.entity';
import {OmniGuard} from "../../core/guards/omni.guard";
import {LoggingInterceptor} from "../../core/interceptors/logging.interceptor";
import {JournalingInterceptor} from "../../core/interceptors/journaling.interceptor";

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
    async create(@Body() createContactDto: CreateContactDto) {
        return await this.contactsService.create(createContactDto);
    }

    @Get()
    async findAll(@Query('page') page: string, @Query('rows') row: string) {
        page = page ? page : `${process.env.API_DEFAULT_QUERY_PAGE}`;
        row = row ? row : `${process.env.API_DEFAULT_QUERY_ROWS}`;
        return await this.contactsService.findAll(page, row);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.contactsService.findOne(+id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
        return await this.contactsService.update(+id, updateContactDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.contactsService.remove(+id);
    }
}
