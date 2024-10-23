import {AppService} from '../../app.service'
import {Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {internal} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {ContractMariadbRepository} from './repositories/contract.mariadb.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {Dictionary} from '../../helpers/dictionary.helper'

@Injectable()
export class ContractService implements CrudService<internal.Contract> {
    private readonly log = new LoggerService(ContractService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ContractMariadbRepository) private readonly contractsRepo: ContractMariadbRepository,
    ) {
    }

    async create(contracts: internal.Contract[], sr: ServiceRequest): Promise<internal.Contract[]> {
        const now = new Date(Date.now())
        for (const contract of contracts) {
            await this.validateSystemContact(contract, sr)
            await this.setProductId(contract, sr)
            contract.create_timestamp = now
            contract.modify_timestamp = now
        }
        const createdIds = await this.contractsRepo.create(contracts, sr)
        return await this.contractsRepo.readWhereInIds(createdIds, sr)
    }

    private async setProductId(contract: internal.Contract, sr: ServiceRequest): Promise<void> {
        const product = await this.contractsRepo.readProductByType(contract.type, sr)
        if (product == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.TYPE_INVALID'))
        }
        contract.product_id = product.id
    }

    private async validateSystemContact(contract: internal.Contract, sr: ServiceRequest): Promise<void> {
        const systemContact = await this.contractsRepo.readActiveSystemContact(contract.contact_id, sr)
        if (systemContact == undefined) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_ID_INVALID'))
        }
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Contract> {
        this.log.debug({message: 'read contract by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.contractsRepo.read(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Contract[], number]> {
        this.log.debug({message: 'read all contracts', func: this.read.name, user: sr.user.username})
        return await this.contractsRepo.readAll(sr)
    }

    async update(updates: Dictionary<internal.Contract>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        this.log.debug({message: 'update contract by ids', func: this.read.name, user: sr.user.username, ids: ids})
        for (const id of ids) {
            const contract = updates[id]
            const oldContract = await this.contractsRepo.read(id, sr)
            // TODO: Utils::BillingMappings::get_actual_billing_mapping
            //  $old_resource->{billing_profile_id} = $billing_mapping->billing_profile->id;
            //  $old_resource->{billing_profile_definition} = undef;
            //  delete $old_resource->{profile_package_id};

            if (oldContract.contact_id != contract.contact_id) {
                await this.validateSystemContact(contract, sr)
            }
            await this.setProductId(contract, sr)
        }
        return await this.contractsRepo.update(updates, sr)
    }

}
