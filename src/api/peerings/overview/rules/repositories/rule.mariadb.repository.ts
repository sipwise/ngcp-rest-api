import {Injectable} from '@nestjs/common'
import {EntityNotFoundError, SelectQueryBuilder} from 'typeorm'

import {PeeringRuleOverviewSearchDto} from '~/api/peerings/overview/rules/dto/rule-search.dto'
import {PeeringRuleOverviewRepository} from '~/api/peerings/overview/rules/interfaces/rule.repository'
import {db, internal} from '~/entities'
import {addTiebreakerOrder, configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

// The server columns are null for a rule of a group without servers, booleans come as 0/1
interface RawRuleRow {
    rule_id: number
    group_id: number
    callee_prefix: string
    callee_pattern: string | null
    caller_pattern: string | null
    description: string
    enabled: number
    stopper: number
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
export class PeeringRuleOverviewMariadbRepository extends MariaDbRepository implements PeeringRuleOverviewRepository {
    async readAll(sr: ServiceRequest): Promise<[internal.PeeringOverviewRule[], number]> {
        const qb = await this.createBaseQueryBuilder()
        const searchDto = new PeeringRuleOverviewSearchDto()
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
        const result = await qb.getRawMany<RawRuleRow>()
        return [await mapYield(result, raw => this.rawToInternalRule(raw)), +count]
    }

    async readById(id: string, _sr: ServiceRequest): Promise<internal.PeeringOverviewRule> {
        const [ruleId, serverId] = id.split('-')
        const qb = await this.createBaseQueryBuilder()
        qb.andWhere('rule.id = :ruleId AND COALESCE(server.id, 0) = :serverId', {ruleId: +ruleId, serverId: +serverId})
        const raw = await qb.getRawOne<RawRuleRow>()
        if (raw == undefined)
            throw new EntityNotFoundError(db.provisioning.VoipPeeringRule, id)
        return await this.rawToInternalRule(raw)
    }

    private createBaseQueryBuilder(): Promise<SelectQueryBuilder<db.provisioning.VoipPeeringRule>> {
        const qb = db.provisioning.VoipPeeringRule.createQueryBuilder('rule')
            .select([
                'rule.id AS rule_id',
                'rule.group_id AS group_id',
                'rule.callee_prefix AS callee_prefix',
                'rule.callee_pattern AS callee_pattern',
                'rule.caller_pattern AS caller_pattern',
                'rule.description AS description',
                'rule.enabled AS enabled',
                'rule.stopper AS stopper',
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

    private rawToInternalRule(raw: RawRuleRow): Promise<internal.PeeringOverviewRule> {
        const rule = new internal.PeeringOverviewRule()
        rule.id = `${raw.rule_id}-${raw.server_id ?? 0}`
        rule.ruleId = raw.rule_id
        rule.groupId = raw.group_id
        rule.calleePrefix = raw.callee_prefix
        rule.calleePattern = raw.callee_pattern
        rule.callerPattern = raw.caller_pattern
        rule.description = raw.description
        rule.enabled = raw.enabled == 1
        rule.stopper = raw.stopper == 1
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
