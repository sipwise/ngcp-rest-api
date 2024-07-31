import {PbxGroupMemberRepository} from '../interfaces/pbx-group-member.repository'
import {db, internal} from '../../../../../entities'
import {ServiceRequest} from '../../../../../interfaces/service-request.interface'
import {SelectQueryBuilder} from 'typeorm'
import {RbacRole} from '../../../../../config/constants.config'
import {SearchLogic} from '../../../../../helpers/search-logic.helper'
import {PbxGroupMemberSearchDto} from '../dto/pbx-group-member-search.dto'
import {LoggerService} from '../../../../../logger/logger.service'
import {MariaDbRepository} from '../../../../../repositories/mariadb.repository'
import {NotFoundException} from '@nestjs/common'

export interface FilterBy {
    groupId?: number
}

export class PbxGroupMemberMariadbRepository extends MariaDbRepository implements PbxGroupMemberRepository {
    private readonly log = new LoggerService(PbxGroupMemberMariadbRepository.name)

    async readAll(sr: ServiceRequest, filter?:FilterBy): Promise<[internal.PbxGroupMember[], number]> {
        const searchLogic = new SearchLogic(sr, Object.keys(new PbxGroupMemberSearchDto()))
        const query = await this.generateBaseQuery(sr, searchLogic)
        this.addFilterBy(query, filter)

        query.limit(searchLogic.rows).offset(searchLogic.rows * (searchLogic.page - 1))

        if (searchLogic.orderBy != null) {
            query.addOrderBy(searchLogic.orderBy, searchLogic.orderByDirection)
        }

        this.addSearchFilterToQueryBuilder(query, searchLogic, sr)

        const result = await query.getRawMany()
        const totalCount = await query.getCount()

        const transformed = await Promise.all(result.map(async group => {
            return this.rawToInternalPbxGroupMember(group)
        }))

        return [transformed, totalCount]
    }

    async readById(id: number, sr: ServiceRequest, filter?:FilterBy): Promise<internal.PbxGroupMember> {
        const query = await this.generateBaseQuery(sr)
        this.addFilterBy(query, filter)

        query.andWhere('member_subquery.member_id = :id', {id: id})

        const result = await query.getRawOne()
        if (!result) {
            throw new NotFoundException()
        }
        return this.rawToInternalPbxGroupMember(result)
    }

    private async generateBaseQuery(sr: ServiceRequest, searchLogic?: SearchLogic): Promise<SelectQueryBuilder<db.provisioning.VoipSubscriber>> {
        const memberSubQuery = db.provisioning.VoipSubscriber.createQueryBuilder('sm')
            .select([
                'bm.id AS member_subscriberId',
                'sm.pbx_extension AS member_extension',
                'dm.domain AS member_domain',
                'sm.username AS member_username',
                'pm.group_id AS member_group_id',
                'pm.id AS member_id',
            ])
            .innerJoin('voip_pbx_groups', 'pm', 'pm.subscriber_id = sm.id')
            .innerJoin('sm.billing_voip_subscriber', 'bm')
            .innerJoin('sm.domain', 'dm')

        const query = db.provisioning.VoipSubscriber.createQueryBuilder('sg')
            .select([
                'sg.username AS group_name',
                'sg.pbx_hunt_policy',
                'sg.pbx_hunt_timeout',
                'sg.pbx_extension',
                'bg.id AS group_bsub_id',
                'sg.id AS group_psub_id',
                'bg.contract_id AS customer_id',
                'dg.domain AS domain',
                'member_subquery.member_subscriberId',
                'member_subquery.member_extension',
                'member_subquery.member_domain',
                'member_subquery.member_username',
                'member_subquery.member_group_id',
                'member_subquery.member_id',
            ])
            .innerJoin('sg.billing_voip_subscriber', 'bg')
            .innerJoin('sg.domain', 'dg')
            .leftJoin('(' + memberSubQuery.getQuery() + ')', 'member_subquery', 'member_subquery.member_group_id = sg.id')
            .where('sg.is_pbx_group = 1')

        this.addPermissionFilterToQueryBuilder(query, sr)

        return query
    }

    private addSearchFilterToQueryBuilder(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, searchLogic: SearchLogic, sr: ServiceRequest) {
        const params = sr.query
        for (const property of searchLogic.searchableFields) {
            if (params[property] != null) {
                let value: string = params[property]

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

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, sr: ServiceRequest) {
        if (sr.user.role == RbacRole.reseller) {
            qb
                .innerJoin('bg.contract', 'contract')
                .innerJoin('contract.contact', 'contact')
                .where('contact.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
        } else if (sr.user.role == RbacRole.subscriber) {
            qb.where('bg.id = :subscriber_id', {subscriber_id: sr.user.id})
        }
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.groupId) {
                qb.andWhere('bg.id = :groupId', {groupId: filterBy.groupId})
            }
        }
    }

    private rawToInternalPbxGroupMember(raw: any): internal.PbxGroupMember {
        const group = new internal.PbxGroupMember()
        group.id = raw['member_id']
        group.groupId = raw['group_bsub_id']
        group.extension = raw['member_extension']
        group.subscriberId = raw['member_subscriberId']
        group.username = raw['member_username']
        group.domain = raw['member_domain']
        return group
    }

}