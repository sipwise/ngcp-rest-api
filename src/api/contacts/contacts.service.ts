import {Inject, Injectable} from '@nestjs/common'
import {ContactCreateDto} from './dto/contact-create.dto'
import {Contact} from '../../entities/db/billing/contact.entity'
import {CONTACT_REPOSITORY} from '../../config/constants.config'
import {CrudService} from '../../interfaces/crud-service.interface'
import {ContactResponseDto} from './dto/contact-response.dto'

@Injectable()
export class ContactsService implements CrudService<ContactCreateDto, ContactResponseDto> {
    constructor(
        @Inject(CONTACT_REPOSITORY) private readonly contactsRepository: typeof Contact,
    ) {
    }

    async create(entity: ContactCreateDto): Promise<ContactResponseDto> {
        return Promise.resolve(undefined);
    }

    async delete(id: number): Promise<number> {
        return Promise.resolve(0);
    }

    async read(id: number): Promise<ContactResponseDto> {
        return Promise.resolve(undefined);
    }

    async readAll(page: string, rows: string): Promise<ContactResponseDto[]> {
        return Promise.resolve([]);
    }

    async update(id: number, entity: ContactCreateDto): Promise<[number, ContactResponseDto[]]> {
        return Promise.resolve([0, []]);
    }
}
