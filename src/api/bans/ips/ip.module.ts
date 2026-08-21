import {Module,forwardRef} from '@nestjs/common'

import {BanIpController} from './ip.controller'
import {BanIpService} from './ip.service'
import {BanIpRedisRepository} from './repositories/ip.redis.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    providers: [BanIpService, BanIpRedisRepository],
    controllers: [BanIpController],
})
export class BanIpModule {
}
