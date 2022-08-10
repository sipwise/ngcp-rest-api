import {AppService} from '../../app.service'
import {Injectable, Logger, MethodNotAllowedException, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation} from '../../helpers/patch.helper'
import {internal} from '../../entities'
import {Messages} from '../../config/messages.config'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContractsMariadbRepository} from './repositories/contracts.mariadb.repository'
import {deepCopy} from '../../repositories/acl-role.mock.repository'
import {CrudService} from '../../interfaces/crud-service.interface'

@Injectable()
export class ContractsService implements CrudService<internal.Contract> {
    private readonly log: Logger = new Logger(ContractsService.name)

    constructor(
        private readonly app: AppService,
        private readonly contractsRepo: ContractsMariadbRepository,
    ) {
    }

    async adjust(id: number, patch: Operation | Operation[], sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'adjust contract by id', func: this.adjust.name, user: sr.user.username, id: id})
        let contract = await this.contractsRepo.read(id, sr)
        const oldContract = deepCopy(contract)
        // TODO: Utils::BillingMappings::get_actual_billing_mapping
        //  $old_resource->{billing_profile_id} = $billing_mapping->billing_profile->id;
        //  $old_resource->{billing_profile_definition} = undef;
        //  delete $old_resource->{profile_package_id};

        contract = applyPatch(contract, patch).newDocument

        if (oldContract.contact_id != contract.contact_id) {
            await this.validateSystemContact(contract, sr)
        }
        await this.setProductId(contract, sr)
        return await this.contractsRepo.update(id, contract, sr)
    }

    async create(contract: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'create contract', func: this.create.name, user: sr.user.username})
        await this.validateSystemContact(contract, sr)
        await this.setProductId(contract, sr)
        // TODO: Utils::BillingMappings::prepare_billing_mappings
        // TODO: Utils::Contract::is_peering_reseller_product && Utils::BillingMappings::check_prepaid_profiles_exist
        // TODO: Utils::BillingMappings::append_billing_mappings
        // TODO: Utils::ProfilePackages::create_initial_contract_balances

        return this.contractsRepo.create(contract, sr)
    }

    private async setProductId(contract: internal.Contract, sr: ServiceRequest) {
        const product = await this.contractsRepo.readProductByType(contract.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_TYPE))
        }
        contract.product_id = product.id
    }

    private async validateSystemContact(contract: internal.Contract, sr: ServiceRequest) {
        const systemContact = await this.contractsRepo.readActiveSystemContact(contract.contact_id, sr)
        if (systemContact == undefined) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.INVALID_CONTACT_ID))
        }
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        throw new MethodNotAllowedException()
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'read contract by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.contractsRepo.read(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({message: 'read all contracts', func: this.read.name, user: sr.user.username})
        return await this.contractsRepo.readAll(sr)
    }

    async update(id: number, contract: internal.Contract, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'update contract by id', func: this.read.name, user: sr.user.username, id: id})
        const oldContract = await this.contractsRepo.read(id, sr)
        // TODO: Utils::BillingMappings::get_actual_billing_mapping
        //  $old_resource->{billing_profile_id} = $billing_mapping->billing_profile->id;
        //  $old_resource->{billing_profile_definition} = undef;
        //  delete $old_resource->{profile_package_id};

        if (oldContract.contact_id != contract.contact_id) {
            await this.validateSystemContact(contract, sr)
        }
        await this.setProductId(contract, sr)
        return await this.contractsRepo.update(id, contract, sr)
    }
}
