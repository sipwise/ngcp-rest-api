import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact} from './contact.entity';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiCreatedResponse({
    type: Contact,
  })
  async create(@Body() createContactDto: CreateContactDto) {
    return await this.contactsService.create(createContactDto);
  }

  @Get()
  async findAll() {
    return await this.contactsService.findAll();
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
