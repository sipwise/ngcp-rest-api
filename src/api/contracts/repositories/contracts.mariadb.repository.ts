import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {Equal, IsNull, Not} from 'typeorm'
import {Injectable, Logger, MethodNotAllowedException} from '@nestjs/common'
import {ContractSearchDto} from '../dto/contract-search.dto'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {db, internal} from '../../../entities'
import {ContractStatus} from '../../../entities/internal/contract.internal.entity'
import {ContractsRepository} from '../interfaces/contracts.respository'
import {ContactStatus} from 'entities/internal/contact.internal.entity'
import {ProductClass} from 'entities/internal/product.internal.entity'

@Injectable()
export class ContractsMariadbRepository implements ContractsRepository {

    private readonly log: Logger = new Logger(ContractsMariadbRepository.name)

    @HandleDbErrors
    async create(entity: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({
            message: 'create contract',
            func: this.create.name,
            user: sr.user.username,
        })
        const contract = new db.billing.Contract().fromInternal(entity)

        const now = new Date(Date.now())
        contract.create_timestamp = now
        contract.modify_timestamp = now

        await db.billing.Contract.insert(contract)
        return contract.toInternal()
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
    }

    @HandleDbErrors
    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({
            message: 'read contract by id',
            func: this.read.name,
            user: sr.user.username,
            id: id,
        })
        return (await db.billing.Contract.findOneByOrFail({ id: id })).toInternal()
    }

    @HandleDbErrors
    async readActiveSystemContact(id: number, sr: ServiceRequest): Promise<internal.Contact> {
        this.log.debug({
            message: 'read active system contact by id',
            func: this.readActiveSystemContact.name,
            user: sr.user.username,
            id: id,
        })
        const contact = await db.billing.Contact.findOneBy({
            id: id,
            status: Not<ContactStatus.Terminated>(ContactStatus.Terminated),
            reseller_id: IsNull(),
        })
        return contact != undefined ? contact.toInternal() : undefined
    }

    @HandleDbErrors
    async readProductByType(type: string, sr: ServiceRequest): Promise<internal.Product> {
        this.log.debug({
            message: 'read product by type',
            func: this.readProductByType.name,
            user: sr.user.username,
            type: type,
        })
        const product = await db.billing.Product.findOneBy({ class: <ProductClass>type })
        return product != undefined ? product.toInternal() : undefined
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({
            message: 'read all contracts',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const queryBuilder = db.billing.Contract.createQueryBuilder('contract')
        const constractSearchDtoKeys = Object.keys(new ContractSearchDto())
        await configureQueryBuilder(queryBuilder, sr.query, new SearchLogic(sr, constractSearchDtoKeys))
        queryBuilder.leftJoinAndSelect('contract.product', 'product')
        const [result, totalCount] = await queryBuilder.getManyAndCount()
        return [result.map(r => r.toInternal()), totalCount]
    }

    @HandleDbErrors
    async update(id: number, contract: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({
            message: 'update contract ty id',
            func: this.readAll.name,
            user: sr.user.username,
            id: id,
        })
        const update = new db.billing.Contract().fromInternal(contract)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        update.modify_timestamp = new Date(Date.now())
        await db.billing.Contract.update(id, update)

        return await this.read(id, sr)
    }

    @HandleDbErrors
    async save(id: number, newContract: internal.Contract): Promise<internal.Contract> {
        // let oldContract = await db.billing.Contract.findOneOrFail(id)
        // const billingMapping = Utils::BillingMappings::get_actual_billing_mapping(c => $c, now => $now, contract => $contract, );
        // const billingProfile = billingMapping.billingProfile

        // $resource->{contact_id} //= undef;
        // $resource->{type} //= $contract->product->class;
        // I think above two steps are redundant

        const setPackage: boolean = newContract.billing_profile_definition == 'package' // TODO: check because v1 definition does not contain "package" in enum "billing_profile_definition

        // Utils::BillingMappings::prepare_billing_mappings

        //     if (
        //         NGCP::Panel::Utils::Contract::is_peering_reseller_contract( c => $c, contract => $contract )
        //         &&
        //         ( my $prepaid_billing_profile_exist = NGCP::Panel::Utils::BillingMappings::check_prepaid_profiles_exist(
        //             c => $c,
        //             mappings_to_create => $mappings_to_create) )
        //     ) {

        // if (newContract.status == 'terminated') {

        // }
        //oldContract = await db.billing.Contract.merge(oldContract, this.inflate(newContract))
        //await oldContract.save()
        //return oldContract
        return
    }
}