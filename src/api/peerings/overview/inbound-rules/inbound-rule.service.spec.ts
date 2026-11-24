import {StreamableFile} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {PeeringInboundRuleOverviewModule} from './inbound-rule.module'
import {PeeringInboundRuleOverviewService} from './inbound-rule.service'
import {PeeringInboundRuleOverviewMariadbRepository} from './repositories/inbound-rule.mariadb.repository'
import {PeeringInboundRuleOverviewMockRepository} from './repositories/inbound-rule.mock.repository'

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

describe('PeeringInboundRuleOverviewService', () => {
    let service: PeeringInboundRuleOverviewService
    let ruleRepo: PeeringInboundRuleOverviewMockRepository

    beforeEach(async () => {
        ruleRepo = new PeeringInboundRuleOverviewMockRepository()
        ruleRepo.db['1-2'] = Object.assign(new internal.PeeringOverviewInboundRule(), {
            id: '1-2',
            ruleId: 1,
            groupId: 5,
            field: 'from_user',
            pattern: '^43',
            priority: 1,
            enabled: true,
            groupName: 'group',
            groupPriority: 1,
            serverId: 2,
            serverName: 'server2',
            serverEnabled: true,
        })
        const module: TestingModule = await Test.createTestingModule({
            imports: [AppModule, PeeringInboundRuleOverviewModule],
        })
            .overrideProvider(PeeringInboundRuleOverviewMariadbRepository).useValue(ruleRepo)
            .compile()
        service = module.get<PeeringInboundRuleOverviewService>(PeeringInboundRuleOverviewService)
    })

    describe('exportCsv', () => {
        it('exports the rows without the resource url', async () => {
            const file = await service.exportCsv(sr)
            expect(file.getHeaders().disposition).toEqual('attachment; filename="peering_overview_inbound_rules.csv"')
            const lines = await readCsv(file)
            expect(lines).toHaveLength(2)
            expect(lines[0]).not.toContain('resourceUrl')
            expect(lines[1].split(',').slice(0, 6)).toEqual(['1-2', '1', '5', '2', 'from_user', '^43'])
        })
    })
})
