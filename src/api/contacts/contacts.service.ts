import {Inject, Injectable} from '@nestjs/common'
import {CreateContactDto} from './dto/create-contact.dto'
import {UpdateContactDto} from './dto/update-contact.dto'
import {Contact} from '../../entities/db/billing/contact.entity'
import {CONTACT_REPOSITORY} from '../../config/constants.config'

@Injectable()
export class ContactsService {
    constructor(
        @Inject(CONTACT_REPOSITORY) private readonly contactsRepository: typeof Contact,
    ) {
    }

    async create(contact: CreateContactDto): Promise<Contact> {
        return this.contactsRepository.create<Contact>(contact)
    }

    async findAll(page: string, rows: string): Promise<Contact[]> {
        let result = await this.contactsRepository.findAndCountAll({limit: +rows, offset: +rows * (+page - 1)})
        return result.rows
    }

    async findOne(id: number) {
        return this.contactsRepository.findOne<Contact>({where: {id}})
    }

    async update(id: number, contact: UpdateContactDto) {
        return this.contactsRepository.update<Contact>(contact, {where: {id}})
    }

    async remove(id: number) {
        return this.contactsRepository.destroy({where: {id}})
    }
}
