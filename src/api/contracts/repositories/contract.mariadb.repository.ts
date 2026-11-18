import {Injectable, MethodNotAllowedException} from '@nestjs/common'
import {In, IsNull, Not} from 'typeorm'

import {ContractSearchDto} from '~/api/contracts/dto/contract-search.dto'
import {ContractRepository} from '~/api/contracts/interfaces/contract.repository'
import {AppService} from '~/app.service'
import {db, internal} from '~/entities'
import {ContactStatus} from '~/entities/internal/contact.internal.entity'
import {ContractBillingProfileDefinition} from '~/entities/internal/contract.internal.entity'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {billingMappingsCsv} from '~/helpers/billing-mapping.helper'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class ContractMariadbRepository extends MariaDbRepository implements ContractRepository {
    private readonly log = new LoggerService(ContractMariadbRepository.name)

    constructor(
        private readonly app: AppService,
    ) {
        super()
    }

    async create(contracts: internal.Contract[], _sr: ServiceRequest): Promise<number[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        const values = contracts.map(contract => new db.billing.Contract().fromInternal(contract))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map((obj: {id: number}) => obj.id)
    }

    delete(_id: number, _sr: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({
            message: 'read contract by id',
            func: this.read.name,
            user: sr.user.username,
            id: id,
        })
        const contract = (await db.billing.Contract.findOneOrFail({where: {id: id}, relations: {product: true}})).toInternal()
        return (await this.setActualBillingProfiles([contract]))[0]
    }

    // unset ids are left out
    async readBillingProfiles(ids: number[]): Promise<internal.BillingProfile[]> {
        const profileIds = ids.filter(id => id != null)
        if (!profileIds.length)
            return []
        const profiles = await db.billing.BillingProfile.findBy({id: In(profileIds)})
        return profiles.map(profile => profile.toInternal())
    }

    async appendBillingMappings(contractId: number, mappings: internal.BillingMapping[], _sr: ServiceRequest): Promise<void> {
        const csv = billingMappingsCsv(mappings)
        await this.app.dbConnection().query('call billing.schedule_contract_billing_profile_network(?,?,?);', [
            contractId,
            undefined,
            csv,
        ])
    }

    // ids of `ids` that are active system contacts
    async readActiveSystemContactIds(ids: number[]): Promise<number[]> {
        const contactIds = ids.filter(id => id != null)
        if (!contactIds.length)
            return []
        const contacts = await db.billing.Contact.find({
            select: {id: true},
            where: {
                id: In(contactIds),
                status: Not<ContactStatus.Terminated>(ContactStatus.Terminated),
                reseller_id: IsNull(),
            },
        })
        return contacts.map(contact => contact.id)
    }

    async readProductsByTypes(types: string[]): Promise<internal.Product[]> {
        if (!types.length)
            return []
        const products = await db.billing.Product.findBy({class: In(types as ProductClass[])})
        return products.map(product => product.toInternal())
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({
            message: 'read all contracts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = db.billing.Contract.createQueryBuilder('contract')
        const searchDto = new ContractSearchDto()
        configureQueryBuilder(
            queryBuilder,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        queryBuilder.leftJoinAndSelect('contract.product', 'product')
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [await this.setActualBillingProfiles(result.map(r => r.toInternal())), totalCount]
    }

    async readWhereInIds(ids: number[], _sr: ServiceRequest): Promise<internal.Contract[]> {
        const qb = db.billing.Contract.createQueryBuilder('contract')
        qb.leftJoinAndSelect('contract.product', 'product')
        const created = await qb.andWhereInIds(ids).getMany()
        return await this.setActualBillingProfiles(created.map(contract => contract.toInternal()))
    }

    async update(updates: Dictionary<internal.Contract>, _sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            const update = new db.billing.Contract().fromInternal(updates[id])
            Object.keys(update).map(key => {
                if (update[key] === undefined)
                    delete update[key]
            })
            update.modify_timestamp = new Date(Date.now())
            await db.billing.Contract.update(id, update)
        }
        return ids
    }

    // billing_profile_id is the actual profile, the definition is always 'id'
    private async setActualBillingProfiles(contracts: internal.Contract[]): Promise<internal.Contract[]> {
        if (!contracts.length)
            return contracts
        const actual = await db.billing.VActualBillingProfile.findBy({contract_id: In(contracts.map(c => c.id))})
        const profileIds = new Map(actual.map(a => [a.contract_id, a.billing_profile_id]))
        for (const contract of contracts) {
            contract.billing_profile_id = profileIds.get(contract.id)
            contract.billing_profile_definition = ContractBillingProfileDefinition.ID
        }
        return contracts
    }
}
