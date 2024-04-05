import {PbxGroupRepository} from '../interfaces/pbx-group.repository'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {SelectQueryBuilder} from 'typeorm'
import {RbacRole} from '../../../config/constants.config'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {PbxGroupSearchDto} from '../dto/pbx-group-search.dto'
import {LoggerService} from '../../../logger/logger.service'

export class PbxGroupMariadbRepository implements PbxGroupRepository {
    private readonly log = new LoggerService(PbxGroupMariadbRepository.name)

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const searchLogic = new SearchLogic(sr, Object.keys(new PbxGroupSearchDto()))
        const query = this.generateBaseQuery(sr, searchLogic)

        query.limit(searchLogic.rows).offset(searchLogic.rows * (searchLogic.page - 1))

        if (searchLogic.orderBy != null) {
            query.addOrderBy(searchLogic.orderBy, searchLogic.order)
        }

        this.addSearchFilterToQueryBuilder(query, searchLogic, sr)

        const result = await query.getRawMany()
        const totalCount = await query.getCount()

        return [result.map(group => this.rawToInternalPbxGroup(group)), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest): Promise<internal.PbxGroup> {

        // TODO: remove this once actual entity mappings are implemented; cannot call getOneOrFail for raw data
        await db.billing.VoipSubscriber.findOneByOrFail({ id: id })

        const result = await this.generateBaseQuery(sr)
            .where('bg.id = :id', {id: id})
            .getRawOne()

        return this.rawToInternalPbxGroup(result)
    }

    private generateBaseQuery(sr: ServiceRequest, searchLogic?: SearchLogic): SelectQueryBuilder<db.provisioning.VoipSubscriber> {

        const memberSubQuery = db.provisioning.VoipSubscriber.createQueryBuilder('sm')
            .select('concat("[", group_concat(json_object("subscriberId", bm.id, "extension", sm.pbx_extension, "domain", dm.domain, "username", sm.username)), "]")')
            .innerJoin('voip_pbx_groups', 'pm', 'pm.subscriber_id = sm.id and pm.group_id = sg.id')
            .innerJoin('sm.billing_voip_subscriber', 'bm')
            .innerJoin('sm.domain', 'dm')

        const query = db.provisioning.VoipSubscriber.createQueryBuilder('sg')
            .select('sg.username', 'group_name')
            .addSelect('sg.pbx_hunt_policy')
            .addSelect('sg.pbx_hunt_timeout')
            .addSelect('sg.pbx_extension')
            .addSelect('bg.id', 'group_bsub_id')
            .addSelect('sg.id', 'group_psub_id')
            .addSelect('bg.contract_id', 'customer_id')
            .addSelect('dg.domain', 'domain')
            .addSelect('(' + memberSubQuery.getQuery() + ')', 'members')
            .innerJoin('sg.billing_voip_subscriber', 'bg')
            .innerJoin('sg.domain', 'dg')
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

    private rawToInternalPbxGroup(raw: any): internal.PbxGroup {
        const group = new internal.PbxGroup()
        group.id = raw['group_bsub_id']
        group.extension = raw['sg_pbx_extension']
        group.name = raw['group_name']
        group.huntPolicy = raw['sg_pbx_hunt_policy']
        group.huntTimeout = raw['sg_pbx_hunt_timeout']
        group.members = JSON.parse(raw['members'])
        group.customerId = raw['customer_id']
        group.domain = raw['domain']
        return group
    }

}