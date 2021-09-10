import {BadRequestException, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {applyPatch, Operation as PatchOperation} from 'fast-json-patch'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {SystemcontactBaseDto} from './dto/systemcontact-base.dto'
import {db} from '../../entities'
import {FindManyOptions, FindOneOptions, IsNull} from 'typeorm'
import {ServiceRequest} from '../../interfaces/service-request.interface'

@Injectable()
export class SystemcontactsService implements CrudService<SystemcontactCreateDto, SystemcontactResponseDto> {
    constructor() {
    }

    @HandleDbErrors
    async create(entity: SystemcontactCreateDto, req: ServiceRequest): Promise<SystemcontactResponseDto> {
        if (entity['reseller_id'] !== undefined) {
            throw new BadRequestException('reseller_id not allowed on systemcontacts') // TODO: proper error message
        }
        let contact = db.billing.Contact.create(entity)

        let now = new Date(Date.now())
        contact.create_timestamp = now
        contact.modify_timestamp = now

        // $resource->{country}{id} = delete $resource->{country}} // TODO: why set the country as country.id
        // $resource->{timezone}{name} = delete $resource->{timezone}; // TODO: why set the timezone as timezone.name
        // $resource->{timezone} = $resource->{timezone}{name}; // TODO: what's happening? Prev steps just for form validation?
        await db.billing.Contact.insert(contact)
        return this.toResponse(contact)
    }

    @HandleDbErrors
    async delete(id: number): Promise<number> {
        let contact = await db.billing.Contact.findOneOrFail(id)
        if (contact.reseller_id) {
            throw new BadRequestException('cannot delete customercontact') // TODO: find better description
        }
        await contact.remove()
        return 1
    }

    @HandleDbErrors
    async read(id: number): Promise<SystemcontactResponseDto> {
        const pattern: FindOneOptions = {
            where: {
                reseller_id: IsNull(),
            },
        }
        return this.toResponse(await db.billing.Contact.findOneOrFail(id, pattern))
    }

    @HandleDbErrors
    async readAll(page: number, rows: number): Promise<SystemcontactResponseDto[]> {
        const pattern: FindManyOptions = {
            where: {
                reseller_id: IsNull(),
            },
            take: rows,
            skip: rows * (page - 1),
        }
        const result = await db.billing.Contact.find(pattern)
        return result.map(r => this.toResponse(r))
    }

    @HandleDbErrors
    async update(id: number, dto: SystemcontactCreateDto): Promise<SystemcontactResponseDto> {
        const oldContact = await db.billing.Contact.findOneOrFail(id)
        if (dto.reseller_id || oldContact.reseller_id) {
            throw new UnprocessableEntityException('invalid reseller_id')
        }
        let newContact = db.billing.Contact.merge(oldContact, dto) // TODO: Should set new object and not merge
        return this.toResponse(await newContact.save())
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation[]): Promise<SystemcontactResponseDto> {
        let oldContact = await db.billing.Contact.findOneOrFail(id)

        let contact = this.deflate(oldContact)
        contact = applyPatch(contact, patch).newDocument
        const newReseller = db.billing.Contact.merge(oldContact, contact)
        return this.toResponse(await newReseller.save())
    }

    toResponse(c: db.billing.Contact): SystemcontactResponseDto {
        return {
            bankname: c.bankname,
            bic: c.bic,
            city: c.city,
            company: c.company,
            comregnum: c.comregnum,
            country: c.country,
            email: c.email,
            faxnumber: c.faxnumber,
            firstname: c.firstname,
            gender: c.gender,
            gpp0: c.gpp0,
            gpp1: c.gpp1,
            gpp2: c.gpp2,
            gpp3: c.gpp3,
            gpp4: c.gpp4,
            gpp5: c.gpp5,
            gpp6: c.gpp6,
            gpp7: c.gpp7,
            gpp8: c.gpp8,
            gpp9: c.gpp9,
            iban: c.iban,
            id: c.id,
            lastname: c.lastname,
            mobilenumber: c.mobilenumber,
            newsletter: c.newsletter,
            phonenumber: c.phonenumber,
            postcode: c.postcode,
            reseller_id: c.reseller_id,
            status: c.status,
            street: c.street,
            timezone: c.timezone,
            vatnum: c.vatnum,
        }
    }

    private inflate(dto: SystemcontactBaseDto): db.billing.Contact {
        return db.billing.Contact.create(dto)
    }

    private deflate(entry: db.billing.Contact): SystemcontactBaseDto {
        return Object.assign(entry)
    }

}

