import { Inject, Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './contact.entity'
import { CONTACT_REPOSITORY } from 'src/core/constants';

@Injectable()
export class ContactsService {
  constructor(
      @Inject(CONTACT_REPOSITORY) private readonly contactsRepository: typeof Contact
  ){}

  async create(contact: CreateContactDto): Promise<Contact> {
    return await this.contactsRepository.create<Contact>(contact);
  }

  async findAll() {
    return await this.contactsRepository.findAll<Contact>()
  }

  async findOne(id: number) {
    return await this.contactsRepository.findOne<Contact>({ where: { id }});
  }

  async update(id: number, contact: UpdateContactDto) {
    return await this.contactsRepository.update<Contact>(contact, { where: { id }});
  }

  async remove(id: number) {
    return await this.contactsRepository.destroy({ where: { id }});
  }
}
