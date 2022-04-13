import {PbxgroupsRepository} from '../interfaces/pbxgroups.repository'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {Logger} from '@nestjs/common'
import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {SelectQueryBuilder} from 'typeorm'
import {RbacRole} from '../../../config/constants.config'
import {SearchLogic} from '../../../helpers/search-logic.helper'

export class PbxgroupsMariadbRepository implements PbxgroupsRepository {
    private readonly log: Logger = new Logger(PbxgroupsMariadbRepository.name)

    @HandleDbErrors
    async readAll(req: ServiceRequest): Promise<[internal.PbxGroup[], number]> {
        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(req)
        const [result, totalCount] = await this.generateBaseQuery(req)
            .limit(rows)
            .offset(rows * (page - 1))
            .getRawMany()

        return [result.map(group => this.rawToInternalPbxGroup(group)), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, req: ServiceRequest): Promise<internal.PbxGroup> {

        // TODO: remove this once actual entity mappings are implemented; cannot call getOneOrFail for raw data
        await db.billing.VoipSubscriber.findOneOrFail(id)

        const result = await this.generateBaseQuery(req)
            .where('bg.id = :id', {id: id})
            .getRawOne()

        return this.rawToInternalPbxGroup(result)
    }

    private generateBaseQuery(req: ServiceRequest): SelectQueryBuilder<any> {
        const distinctGroupQuery = db.provisioning.VoipPbxGroup.createQueryBuilder('pg')
            .select('group_id')
            .distinct(true)

        const memberSubQuery = db.provisioning.VoipSubscriber.createQueryBuilder('sm')
            .select('concat("[", group_concat(json_object("subscriberId", bm.id, "extension", sm.pbx_extension)), "]")')
            .innerJoin('voip_pbx_groups', 'pm', 'pm.subscriber_id = sm.id and pm.group_id = pg.group_id')
            .innerJoin('sm.billing_voip_subscriber', 'bm')

        const query = db.provisioning.VoipSubscriber.createQueryBuilder('sg')
            .select('sg.username', 'group_name')
            .addSelect('sg.pbx_hunt_policy')
            .addSelect('sg.pbx_hunt_timeout')
            .addSelect('bg.id', 'group_bsub_id')
            .addSelect('pg.group_id', 'group_psub_id')
            .addSelect('(' + memberSubQuery.getQuery() + ')', 'members')
            .innerJoin('(' + distinctGroupQuery.getQuery() + ')', 'pg', 'pg.group_id = sg.id')
            .innerJoin('sg.billing_voip_subscriber', 'bg')

        this.addPermissionFilterToQueryBuilder(query, req)

        return query
    }

    private addPermissionFilterToQueryBuilder(qb: SelectQueryBuilder<any>, req: ServiceRequest) {
        if (req.user.role == RbacRole.reseller) {
            qb
                .innerJoin('bg.contract', 'contract')
                .innerJoin('contract.contact', 'contact')
                .where('contact.reseller_id = :reseller_id', {reseller_id: req.user.reseller_id})
        } else if (req.user.role == RbacRole.subscriber) {
            qb.where('bg.id = :subscriber_id', {subscriber_id: req.user.id})
        }
    }

    private rawToInternalPbxGroup(raw: any): internal.PbxGroup {
        const group = new internal.PbxGroup()
        group.id = raw['group_bsub_id']
        group.name = raw['group_name']
        group.huntPolicy = raw['sg_pbx_hunt_policy']
        group.huntTimeout = raw['sg_pbx_hunt_timeout']
        group.members = JSON.parse(raw['members'])
        return group
    }

}