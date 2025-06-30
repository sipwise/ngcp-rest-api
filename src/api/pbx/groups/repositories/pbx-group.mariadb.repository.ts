import {NotFoundException} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {PbxGroupSearchDto} from '~/api/pbx/groups/dto/pbx-group-search.dto'
import {PbxGroupRepository} from '~/api/pbx/groups/interfaces/pbx-group.repository'
import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'


export class PbxGroupMariadbRepository extends MariaDbRepository implements PbxGroupRepository {
    private readonly log = new LoggerService(PbxGroupMariadbRepository.name)

    async readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const searchDto = new PbxGroupSearchDto()
        const searchLogic = new SearchLogic(
            sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        )
        const query = await this.generateBaseQuery(sr, searchLogic)

        query.limit(searchLogic.rows).offset(searchLogic.rows * (searchLogic.page - 1))

        if (searchLogic.orderBy != null) {
            query.addOrderBy(searchLogic.orderBy, searchLogic.orderByDirection)
        }

        this.addSearchFilterToQueryBuilder(query, searchLogic, sr)

        const result = await query.getRawMany()
        const totalCount = await query.getCount()

        const transformed = await Promise.all(result.map(async group => {
            return this.rawToInternalPbxGroup(group)
        }))

        return [transformed, totalCount]
    }

    async readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroup> {
        const query = await this.generateBaseQuery(sr)
        query.andWhere('bg.id = :id', {id: id})

        const result = await query.getRawOne()
        if (!result) {
            throw new NotFoundException()
        }

        return this.rawToInternalPbxGroup(result)
    }

    private async generateBaseQuery(sr: ServiceRequest, _searchLogic?: SearchLogic): Promise<SelectQueryBuilder<db.provisioning.VoipSubscriber>> {
        const query = db.provisioning.VoipSubscriber.createQueryBuilder('sg')
            .select('sg.username', 'group_name')
            .addSelect('sg.pbx_hunt_policy')
            .addSelect('sg.pbx_hunt_timeout')
            .addSelect('sg.pbx_extension')
            .addSelect('bg.id', 'group_bsub_id')
            .addSelect('sg.id', 'group_psub_id')
            .addSelect('bg.contract_id', 'customer_id')
            .addSelect('dg.domain', 'domain')
            .innerJoin('sg.billing_voip_subscriber', 'bg')
            .innerJoin('sg.domain', 'dg')
            .where('sg.is_pbx_group = 1')

        this.addPermissionFilterToQueryBuilder(query, sr)

        return query
    }

    private addSearchFilterToQueryBuilder(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, searchLogic: SearchLogic, sr: ServiceRequest): void {
        const params = sr.query
        for (const property of searchLogic.searchableFields) {
            if (params[property] != null) {
                let value: string = params[property].toString()

                const whereComparator = value.includes('*') ? 'like' : '='
                value = value.replace(/\*/g, '%')

                let where: string

                switch (property) {
                    case 'customer_id':
                        where = 'bg.contract_id'
                        break
                    case 'extension':
                        where = 'bg.contract_id'
                        break
                    case 'hunt_policy':
                        where = 'sg.pbx_hunt_policy'
                        break
                    case 'hunt_timeout':
                        where = 'sg.pbx_hunt_timeout'
                        break
                    case 'name':
                        where = 'sg.username'
                        break
                }
                if (searchLogic.searchOr) {
                    qb.orWhere(`${where} ${whereComparator} :${property}`, {[`${property}`]: value})
                } else {
                    qb.andWhere(`${where} ${whereComparator} :${property}`, {[`${property}`]: value})
                }
            }
        }
    }

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, sr: ServiceRequest): void {
        if (sr.user.role == RbacRole.reseller) {
            qb
                .innerJoin('bg.contract', 'contract')
                .innerJoin('contract.contact', 'contact')
                .where('contact.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
        } else if (sr.user.role == RbacRole.subscriber) {
            qb.where('bg.id = :subscriber_id', {subscriber_id: sr.user.id})
        }
    }

    private rawToInternalPbxGroup(raw: unknown): internal.PbxGroup {
        const group = new internal.PbxGroup()
        group.id = raw['group_bsub_id']
        group.extension = raw['sg_pbx_extension']
        group.name = raw['group_name']
        group.huntPolicy = raw['sg_pbx_hunt_policy']
        group.huntTimeout = raw['sg_pbx_hunt_timeout']
        group.customerId = raw['customer_id']
        group.domain = raw['domain']
        return group
    }

}