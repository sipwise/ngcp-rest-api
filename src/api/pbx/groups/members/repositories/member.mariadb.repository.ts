import {NotFoundException} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {PbxGroupMemberSearchDto} from '~/api/pbx/groups/members/dto/member-search.dto'
import {PbxGroupMemberRepository} from '~/api/pbx/groups/members/interfaces/member.repository'
import {RbacRole} from '~/config/constants.config'
import {db, internal} from '~/entities'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'


export interface FilterBy {
    groupId?: number
}

export class PbxGroupMemberMariadbRepository extends MariaDbRepository implements PbxGroupMemberRepository {
    private readonly log = new LoggerService(PbxGroupMemberMariadbRepository.name)

    async readAll(sr: ServiceRequest, filter?:FilterBy): Promise<[internal.PbxGroupMember[], number]> {
        const searchDto = new PbxGroupMemberSearchDto()
        const searchLogic = new SearchLogic(
            sr,
            Object.keys(searchDto),
            undefined,
            searchDto._alias,
        )
        const query = await this.generateBaseQuery(sr, searchLogic)
        this.addFilterBy(query, filter)
        this.addSearchFilterToQueryBuilder(query, searchLogic, sr)

        const {count} = await query.clone().select('COUNT(member_subquery.member_id)', 'count').getRawOne()
        const totalCount = +count

        query.limit(searchLogic.rows).offset(searchLogic.rows * (searchLogic.page - 1))

        if (searchLogic.orderBy != null) {
            query.addOrderBy(searchLogic.orderBy, searchLogic.orderByDirection)
        }

        const result = await query.getRawMany()

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

    private async generateBaseQuery(sr: ServiceRequest, _searchLogic?: SearchLogic): Promise<SelectQueryBuilder<db.provisioning.VoipSubscriber>> {
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
            .innerJoin('(' + memberSubQuery.getQuery() + ')', 'member_subquery', 'member_subquery.member_group_id = sg.id')
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
                    case 'subscriber_id':
                        where = 'member_subquery.member_subscriberId'
                        break
                    case 'username':
                        where = 'member_subquery.member_username'
                        break
                    case 'extension':
                        where = 'member_subquery.member_extension'
                        break
                    case 'domain':
                        where = 'member_subquery.member_domain'
                        break
                    case 'id':
                        where = 'member_subquery.member_id'
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
        switch (sr.user.role) {
            case RbacRole.reseller:
                qb
                    .innerJoin('bg.contract', 'contract')
                    .innerJoin('contract.contact', 'contact')
                    .andWhere('contact.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
                break
            case RbacRole.subscriberadmin:
                qb.andWhere('bg.contract_id = :customer_id', {customer_id: sr.user.customer_id})
                break
            case RbacRole.subscriber:
                qb.andWhere(subQb => {
                    const membership = subQb.subQuery()
                        .select('1')
                        .from(db.provisioning.VoipPbxGroup, 'pbx_member')
                        .innerJoin(db.provisioning.VoipSubscriber, 'pbx_member_sub', 'pbx_member_sub.id = pbx_member.subscriber_id')
                        .innerJoin('pbx_member_sub.billing_voip_subscriber', 'pbx_member_bsub')
                        .where('pbx_member.group_id = sg.id')
                        .andWhere('pbx_member_bsub.id = :subscriber_id')
                        .getQuery()
                    return `EXISTS ${membership}`
                }, {subscriber_id: sr.user.id})
                break
        }
    }

    private addFilterBy(qb: SelectQueryBuilder<db.provisioning.VoipSubscriber>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.groupId) {
                qb.andWhere('bg.id = :groupId', {groupId: filterBy.groupId})
            }
        }
    }

    private rawToInternalPbxGroupMember(raw: unknown): internal.PbxGroupMember {
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