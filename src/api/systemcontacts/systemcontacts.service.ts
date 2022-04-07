import {BadRequestException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {CrudService} from '../../interfaces/crud-service.interface'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {SystemcontactCreateDto} from './dto/systemcontact-create.dto'
import {SystemcontactResponseDto} from './dto/systemcontact-response.dto'
import {SystemcontactBaseDto} from './dto/systemcontact-base.dto'
import {db} from '../../entities'
import {FindOneOptions, IsNull} from 'typeorm'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import {SystemcontactSearchDto} from './dto/systemcontact-search.dto'
import {Messages} from '../../config/messages.config'
import {SearchLogic} from '../../helpers/search-logic.helper'

@Injectable()
export class SystemcontactsService implements CrudService<SystemcontactCreateDto, SystemcontactResponseDto> {
    private readonly log = new Logger(SystemcontactsService.name)

    @HandleDbErrors
    async create(entity: SystemcontactCreateDto, req: ServiceRequest): Promise<SystemcontactResponseDto> {
        if (entity['reseller_id'] !== undefined) {
            throw new BadRequestException(Messages.invoke(Messages.RESELLER_ID_SYSTEMCONTACTS, req)) // TODO: proper error message
        }
        const contact = db.billing.Contact.create(entity)

        const now = new Date(Date.now())
        contact.create_timestamp = now
        contact.modify_timestamp = now

        // $resource->{country}{id} = delete $resource->{country}} // TODO: why set the country as country.id
        // $resource->{timezone}{name} = delete $resource->{timezone}; // TODO: why set the timezone as timezone.name
        // $resource->{timezone} = $resource->{timezone}{name}; // TODO: what's happening? Prev steps just for form validation?
        await db.billing.Contact.insert(contact)
        this.log.debug('exit create method')
        return this.toResponse(contact)
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const contact = await db.billing.Contact.findOneOrFail(id)
        if (contact.reseller_id) {
            throw new BadRequestException(Messages.invoke(Messages.DELETE_CUSTOMERCONTACT)) // TODO: find better description
        }
        await contact.remove()
        return 1
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<SystemcontactResponseDto> {
        const pattern: FindOneOptions = {
            where: {
                reseller_id: IsNull(),
            },
        }
        return this.toResponse(await db.billing.Contact.findOneOrFail(id, pattern))
    }

    @HandleDbErrors
    async readAll(req: ServiceRequest): Promise<[SystemcontactResponseDto[], number]> {
        this.log.debug('Entering method readAll')
        this.log.debug({
            message: 'read all system contacts',
            func: this.readAll.name,
            user: req.user.username,
        })
        const queryBuilder = db.billing.Contact.createQueryBuilder('contact')
        const systemcontactSearchDtoKeys = Object.keys(new SystemcontactSearchDto())
        await configureQueryBuilder(queryBuilder, req.query, new SearchLogic(req, systemcontactSearchDtoKeys))
        queryBuilder.andWhere('contact.reseller_id IS NULL')
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(r => this.toResponse(r)), totalCount]
    }

    @HandleDbErrors
    async update(id: number, dto: SystemcontactCreateDto, req: ServiceRequest): Promise<SystemcontactResponseDto> {
        const oldContact = await db.billing.Contact.findOneOrFail(id)
        if (dto.reseller_id || oldContact.reseller_id) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
        }
        const newContact = db.billing.Contact.merge(oldContact, dto) // TODO: Should set new object and not merge
        return this.toResponse(await newContact.save())
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<SystemcontactResponseDto> {
        const oldContact = await db.billing.Contact.findOneOrFail(id)

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

