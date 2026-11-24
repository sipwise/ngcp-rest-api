import {StreamableFile} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {PeeringRuleOverviewMariadbRepository} from './repositories/rule.mariadb.repository'
import {PeeringRuleOverviewMockRepository} from './repositories/rule.mock.repository'
import {PeeringRuleOverviewModule} from './rule.module'
import {PeeringRuleOverviewService} from './rule.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 1,
    reseller_id_required: false,
    role: RbacRole.admin,
    role_data: internal.AclRole.create({id: 2, has_access_to: [internal.AclRole.create({id: 2})]}),
    username: 'administrator',
}

const sr = {returnContent: true, headers: [undefined], params: {}, query: {}, user, req: undefined} as unknown as ServiceRequest

const readCsv = async (file: StreamableFile): Promise<string[]> => {
    const chunks: Buffer[] = []
    for await (const chunk of file.getStream())
        chunks.push(Buffer.from(chunk))
    return Buffer.concat(chunks).toString('utf-8').trim().split(/\r?\n/)
}

describe('PeeringRuleOverviewService', () => {
    let service: PeeringRuleOverviewService
    let ruleRepo: PeeringRuleOverviewMockRepository

    const rule = (serverId: number | null): internal.PeeringOverviewRule => Object.assign(new internal.PeeringOverviewRule(), {
        id: `1-${serverId ?? 0}`,
        ruleId: 1,
        groupId: 5,
        calleePrefix: '43',
        enabled: true,
        stopper: false,
        groupName: 'group',
        groupPriority: 1,
        serverId,
        serverName: serverId == null ? null : `server${serverId}`,
        serverEnabled: serverId == null ? null : true,
    })

    beforeEach(async () => {
        ruleRepo = new PeeringRuleOverviewMockRepository()
        ruleRepo.db['1-2'] = rule(2)
        ruleRepo.db['1-0'] = rule(null)
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, PeeringRuleOverviewModule],
        })
            .overrideProvider(PeeringRuleOverviewMariadbRepository).useValue(ruleRepo)
            .compile()
        service = module.get<PeeringRuleOverviewService>(PeeringRuleOverviewService)
    })

    describe('exportCsv', () => {
        it('exports the rows without the resource url, empty server columns for a group without servers', async () => {
            const file = await service.exportCsv(sr)
            expect(file.getHeaders().disposition).toEqual('attachment; filename="peering_overview_rules.csv"')
            const lines = await readCsv(file)
            expect(lines).toHaveLength(3)
            expect(lines[0].split(',').slice(0, 4)).toEqual(['id', 'rule_id', 'group_id', 'server_id'])
            expect(lines[0]).not.toContain('resourceUrl')
            expect(lines[1].split(',').slice(0, 4)).toEqual(['1-2', '1', '5', '2'])
            expect(lines[2].split(',').slice(0, 4)).toEqual(['1-0', '1', '5', ''])
        })
    })
})
