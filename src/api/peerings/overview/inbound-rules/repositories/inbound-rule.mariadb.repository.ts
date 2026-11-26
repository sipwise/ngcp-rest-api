import {Injectable} from '@nestjs/common'
import {EntityNotFoundError, SelectQueryBuilder} from 'typeorm'

import {PeeringInboundRuleOverviewSearchDto} from '~/api/peerings/overview/inbound-rules/dto/inbound-rule-search.dto'
import {PeeringInboundRuleOverviewRepository} from '~/api/peerings/overview/inbound-rules/interfaces/inbound-rule.repository'
import {db, internal} from '~/entities'
import {addTiebreakerOrder, configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

// The server columns are null for a rule of a group without servers, booleans come as 0/1
interface RawInboundRuleRow {
    rule_id: number
    group_id: number
    field: string
    pattern: string
    reject_code: number | null
    reject_reason: string | null
    priority: number
    enabled: number
    group_name: string
    group_priority: number
    server_id: number | null
    server_name: string | null
    server_host: string | null
    server_ip: string | null
    server_port: number | null
    server_transport: number | null
    server_weight: number | null
    server_enabled: number | null
}

@Injectable()
export class PeeringInboundRuleOverviewMariadbRepository extends MariaDbRepository implements PeeringInboundRuleOverviewRepository {
    async readAll(sr: ServiceRequest): Promise<[internal.PeeringOverviewInboundRule[], number]> {
        const qb = await this.createBaseQueryBuilder()
        const searchDto = new PeeringInboundRuleOverviewSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        // one row per rule and server: getCount() would count the distinct rules
        const {count} = await qb.clone().select('COUNT(*)', 'count').orderBy().limit().offset().getRawOne()
        addTiebreakerOrder(qb, ['rule.id', 'server.id'])
        const result = await qb.getRawMany<RawInboundRuleRow>()
        return [await mapYield(result, raw => this.rawToInternalInboundRule(raw)), +count]
    }

    async readById(id: string, _sr: ServiceRequest): Promise<internal.PeeringOverviewInboundRule> {
        const [ruleId, serverId] = id.split('-')
        const qb = await this.createBaseQueryBuilder()
        qb.andWhere('rule.id = :ruleId AND COALESCE(server.id, 0) = :serverId', {ruleId: +ruleId, serverId: +serverId})
        const raw = await qb.getRawOne<RawInboundRuleRow>()
        if (raw == undefined)
            throw new EntityNotFoundError(db.provisioning.VoipPeeringInboundRule, id)
        return await this.rawToInternalInboundRule(raw)
    }

    private createBaseQueryBuilder(): Promise<SelectQueryBuilder<db.provisioning.VoipPeeringInboundRule>> {
        const qb = db.provisioning.VoipPeeringInboundRule.createQueryBuilder('rule')
            .select([
                'rule.id AS rule_id',
                'rule.group_id AS group_id',
                'rule.field AS field',
                'rule.pattern AS pattern',
                'rule.reject_code AS reject_code',
                'rule.reject_reason AS reject_reason',
                'rule.priority AS priority',
                'rule.enabled AS enabled',
                'grp.name AS group_name',
                'grp.priority AS group_priority',
                'server.id AS server_id',
                'server.name AS server_name',
                'server.host AS server_host',
                'server.ip AS server_ip',
                'server.port AS server_port',
                'server.transport AS server_transport',
                'server.weight AS server_weight',
                'server.enabled AS server_enabled',
            ])
            .innerJoin('rule.group', 'grp')
            .leftJoin('grp.servers', 'server')
        return Promise.resolve(qb)
    }

    private rawToInternalInboundRule(raw: RawInboundRuleRow): Promise<internal.PeeringOverviewInboundRule> {
        const rule = new internal.PeeringOverviewInboundRule()
        rule.id = `${raw.rule_id}-${raw.server_id ?? 0}`
        rule.ruleId = raw.rule_id
        rule.groupId = raw.group_id
        rule.field = raw.field
        rule.pattern = raw.pattern
        rule.rejectCode = raw.reject_code
        rule.rejectReason = raw.reject_reason
        rule.priority = raw.priority
        rule.enabled = raw.enabled == 1
        rule.groupName = raw.group_name
        rule.groupPriority = raw.group_priority
        rule.serverId = raw.server_id
        rule.serverName = raw.server_name
        rule.serverHost = raw.server_host
        rule.serverIp = raw.server_ip
        rule.serverPort = raw.server_port
        rule.serverTransport = raw.server_transport
        rule.serverWeight = raw.server_weight
        rule.serverEnabled = raw.server_enabled == null ? null : raw.server_enabled == 1
        return Promise.resolve(rule)
    }
}
