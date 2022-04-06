import {BadRequestException, HttpException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {CustomercontactCreateDto} from './dto/customercontact-create.dto'
import {CrudService} from '../../interfaces/crud-service.interface'
import {CustomercontactResponseDto} from './dto/customercontact-response.dto'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {CustomercontactBaseDto} from './dto/customercontact-base.dto'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {db} from '../../entities'
import {FindOneOptions, IsNull, Not} from 'typeorm'
import {AppService} from '../../app.service'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContractStatus} from '../contracts/contracts.constants'
import {ContactStatus} from '../../entities/db/billing/contact.mariadb.entity'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import {CustomercontactSearchDto} from './dto/customercontact-search.dto'
import {Messages} from '../../config/messages.config'

@Injectable()
export class CustomercontactsService implements CrudService<CustomercontactCreateDto, CustomercontactResponseDto> {
    private readonly log = new Logger(CustomercontactsService.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    @HandleDbErrors
    async create(entity: CustomercontactCreateDto, req: ServiceRequest): Promise<CustomercontactResponseDto> {
        const contact = await db.billing.Contact.create(entity)

        const now = new Date(Date.now())
        contact.create_timestamp = now
        contact.modify_timestamp = now

        // $resource->{country}{id} = delete $resource->{country}} // TODO: why set the country as country.id
        // $resource->{timezone}{name} = delete $resource->{timezone}; // TODO: why set the timezone as timezone.name
        // $resource->{timezone} = $resource->{timezone}{name}; // TODO: what's happening? Prev steps just for form validation?
        // my $reseller_id;
        if (req.user.role === 'reseller') {
            contact.reseller_id = req.user.reseller_id
        } else if (req.user.role !== 'admin') { // TODO: how do we handle system user?
            // $reseller_id = $c->user->contract->contact->reseller_id; // TODO: do we need to store contract in req.user?
        }

        const reseller = db.billing.Reseller.findOne(contact.reseller_id)
        if (reseller) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID, req))
        }
        await db.billing.Contact.insert(contact)
        // TODO: contact does not contain id at this point
        return this.toResponse(contact)
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const contact = await db.billing.Contact.findOneOrFail(id)
        if (!contact.reseller_id) {
            throw new BadRequestException(Messages.invoke(Messages.DELETE_SYSTEMCONTACT)) // TODO: find better description
        }
        let contract = db.billing.Contract.find({
            where: {
                status: Not(ContractStatus.Terminated),
                contact_id: id,
            },
        })
        // TODO: check for un-terminated subscribers
        if (contract) {
            throw new HttpException(Messages.invoke(Messages.CONTACT_STILL_IN_USE), 423) // 423 HTTP LOCKED
        }
        // TODO: do we delete (instead of terminate) if no related contracts/subscribers as in v1?
        contract = db.billing.Contract.find({
            where: {
                status: ContractStatus.Terminated,
                contact_id: id,
            },
        })
        if (contract) {
            await db.billing.Contact.update(id, {status: ContactStatus.Terminated})
        } else {
            await contact.remove()
        }
        return 1
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<CustomercontactResponseDto> {
        const pattern: FindOneOptions = {
            where: {
                id: id,
                reseller_id: Not(IsNull()),
            },
        }
        return this.toResponse(await db.billing.Contact.findOneOrFail(id, pattern))
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<[CustomercontactResponseDto[], number]> {
        this.log.debug({
            message: 'read all customer contacts',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })
        const queryBuilder = db.billing.Contact.createQueryBuilder('contact')
        const customercontactSearchDtoKeys = Object.keys(new CustomercontactSearchDto())
        await configureQueryBuilder(queryBuilder, req.query,
            {searchableFields: customercontactSearchDtoKeys, rows: +rows, page: +page})
        queryBuilder.andWhere('contact.reseller_id IS NOT NULL')
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(r => this.toResponse(r)), totalCount]
    }

    @HandleDbErrors
    async update(id: number, dto: CustomercontactCreateDto, req: ServiceRequest): Promise<CustomercontactResponseDto> {
        const oldContact = await db.billing.Contact.findOneOrFail(id)
        if (oldContact.reseller_id != dto.reseller_id) {
            const reseller = db.billing.Reseller.findOne(dto.reseller_id)
            if (!reseller) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_RESELLER_ID))
            }
        }
        const newContact = db.billing.Contact.merge(oldContact, dto)
        return this.toResponse(await newContact.save())
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<CustomercontactResponseDto> {
        const oldContact = await db.billing.Contact.findOneOrFail(id)

        let contact = this.deflate(oldContact)
        contact = applyPatch(contact, patch).newDocument
        const newReseller = db.billing.Contact.merge(oldContact, contact)
        return this.toResponse(await newReseller.save())
    }

    toResponse(c: db.billing.Contact): CustomercontactResponseDto {
        return {
            bankname: c.bankname,
            bic: c.bic,
            city: c.city,
            company: c.company,
            comregnum: c.comregnum,
            country: c.country,
            create_timestamp: c.create_timestamp,
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
            modify_timestamp: c.modify_timestamp,
            newsletter: c.newsletter,
            phonenumber: c.phonenumber,
            postcode: c.postcode,
            reseller_id: c.reseller_id,
            status: c.status,
            street: c.street,
            terminate_timestamp: c.terminate_timestamp,
            timezone: c.timezone,
            vatnum: c.vatnum,
        }
    }

    private inflate(dto: CustomercontactBaseDto): db.billing.Contact {
        return db.billing.Contact.create(dto)
    }

    private deflate(entry: db.billing.Contact): CustomercontactBaseDto {
        return Object.assign(entry)
    }
}

