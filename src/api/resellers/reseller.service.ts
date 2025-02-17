import {ForbiddenException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {ResellerMariadbRepository} from './repositories/reseller.mariadb.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {ResellerStatus} from '~/entities/internal/reseller.internal.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'



@Injectable()
export class ResellerService implements CrudService<internal.Reseller> {
    private readonly log = new LoggerService(ResellerService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(ResellerMariadbRepository) private readonly resellerRepo: ResellerMariadbRepository,
    ) {
    }

    async create(resellers: internal.Reseller[], sr: ServiceRequest): Promise<internal.Reseller[]> {
        for (const reseller of resellers) {
            await this.validateContract(reseller)
            const existingReseller = await this.resellerRepo.readByName(reseller.name, sr)
            if (existingReseller != undefined) {
                if (existingReseller.status != ResellerStatus.Terminated) {
                    throw new UnprocessableEntityException(this.i18n.t('errors.NAME_EXISTS', {args: {name: existingReseller.name}}))
                }
                await this.resellerRepo.renameReseller(existingReseller.id, existingReseller.name)
            }
        }
        const createdIds = await this.resellerRepo.create(resellers, sr)
        await this.resellerRepo.createEmailTemplates(createdIds)

        return await this.resellerRepo.readWhereInIds(createdIds)
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

    async update(updates: Dictionary<internal.Reseller>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        if (await this.resellerRepo.readCountOfIds(ids) != ids.length)
            throw new UnprocessableEntityException()
        this.log.debug({message: 'update reseller by ids', func: this.update.name, user: sr.user.username, ids: ids})
        for (const id of ids) {
            const oldReseller = await this.resellerRepo.read(id, sr)
            await this.validateUpdate(oldReseller, updates[id], sr)
        }
        return await this.resellerRepo.update(updates, sr)
    }

    private async validateUpdate(oldReseller: internal.Reseller, newReseller: internal.Reseller, sr: ServiceRequest): Promise<boolean> {
        if (sr.user.reseller_id_required) {
            if (sr.user.reseller_id != newReseller.id) {
                throw new ForbiddenException(this.i18n.t('errors.RESELLER_CHANGE_UNASSOCIATED_FORBIDDEN'))
            }
        }
        if (oldReseller.contract_id != newReseller.contract_id) {
            await this.validateContract(newReseller)
        }
        if (oldReseller.name != newReseller.name) {
            const res = await this.resellerRepo.readByName(newReseller.name, sr)
            if (res != undefined) {
                throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_NAME_EXISTS'))
            }
        }
        return true
    }

    private async validateContract(reseller: internal.Reseller): Promise<void> {
        if (!await this.resellerRepo.contractExists(reseller.contract_id)) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTRACT_NOT_FOUND'))
        }
        if (await this.resellerRepo.resellerWithContractExists(reseller.contract_id)) {
            throw new UnprocessableEntityException(this.i18n.t('errors.RESELLER_CONTRACT_EXISTS'))
        }
        if (!await this.resellerRepo.contractHasSystemContact(reseller.contract_id)) {
            throw new UnprocessableEntityException(this.i18n.t('errors.CONTACT_CONTRACT_INVALID_LINK'))
        }
    }
}
