import {ForbiddenException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {applyPatch, Operation} from '../../helpers/patch.helper'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AppService} from '../../app.service'
import {internal} from '../../entities'
import {Messages} from '../../config/messages.config'
import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'
import {ResellerStatus} from '../../entities/internal/reseller.internal.entity'
import {deepCopy} from '../../repositories/acl-role.mock.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class ResellerService implements CrudService<internal.Reseller> {
    private readonly log = new LoggerService(ResellerService.name)

    constructor(
        private readonly app: AppService,
        @Inject(ResellerMariadbRepository) private readonly resellerRepo: ResellerMariadbRepository,
    ) {
    }

    async create(reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'create reseller', func: this.create.name, user: sr.user.username})
        await this.validateContract(reseller)

        const existingReseller = await this.resellerRepo.readByName(reseller.name, sr)
        if (existingReseller != undefined) {
            if (existingReseller.status != ResellerStatus.Terminated) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.NAME_EXISTS, sr))
            }
            await this.resellerRepo.renameReseller(existingReseller.id, existingReseller.name)
        }
        const result = await this.resellerRepo.create(reseller, sr)
        await this.resellerRepo.createEmailTemplates(result.id)
        return result
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete reseller by id', func: this.delete.name, id: id})
        return await this.resellerRepo.terminate(id, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'read reseller by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.resellerRepo.read(id, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Reseller[], number]> {
        this.log.debug({
            message: 'read all resellers',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.resellerRepo.readAll(sr)
    }

    async update(id: number, reseller: internal.Reseller, sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'update reseller by id', func: this.update.name, user: sr.user.username, id: id})
        const oldReseller = await this.resellerRepo.read(id, sr)
        await this.validateUpdate(oldReseller, reseller, sr)
        return await this.resellerRepo.update(id, reseller, sr)
    }

    async adjust(id: number, patch: Operation | Operation[], sr: ServiceRequest): Promise<internal.Reseller> {
        this.log.debug({message: 'adjust reseller by id', func: this.adjust.name, user: sr.user.username, id: id})

        let reseller = await this.resellerRepo.read(id, sr)
        const oldReseller = deepCopy(reseller)

        reseller = applyPatch(reseller, patch).newDocument
        reseller.id = id

        await this.validateUpdate(oldReseller, reseller, sr)

        return await this.resellerRepo.update(id, reseller, sr)
    }

    private async validateUpdate(oldReseller: internal.Reseller, newReseller: internal.Reseller, sr: ServiceRequest): Promise<boolean> {
        if (sr.user.reseller_id_required) {
            if (sr.user.reseller_id != newReseller.id) {
                throw new ForbiddenException(Messages.invoke(Messages.CHANGE_UNASSOCIATED_FORBIDDEN, sr))
            }
        }
        if (oldReseller.contract_id != newReseller.contract_id) {
            await this.validateContract(newReseller)
        }
        if (oldReseller.name != newReseller.name) {
            const res = await this.resellerRepo.readByName(newReseller.name, sr)
            if (res != undefined) {
                throw new UnprocessableEntityException(Messages.invoke(Messages.NAME_EXISTS, sr))
            }
        }
        return true
    }

    private async validateContract(reseller: internal.Reseller) {
        if (!await this.resellerRepo.contractExists(reseller.contract_id)) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_NOT_FOUND))
        }
        if (await this.resellerRepo.resellerWithContractExists(reseller.contract_id)) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_EXISTS))
        }
        if (!await this.resellerRepo.contractHasSystemContact(reseller.contract_id)) {
            throw new UnprocessableEntityException(Messages.invoke(Messages.CONTRACT_INVALID_LINK))
        }
    }
}
