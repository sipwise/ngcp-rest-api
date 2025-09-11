import {Module,forwardRef} from '@nestjs/common'

import {BanIpController} from './ban-ip.controller'
import {BanIpService} from './ban-ip.service'
import {BanIpRedisRepository} from './repositories/ban-ip.redis.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [BanIpService, BanIpRedisRepository],
    controllers: [BanIpController],
})
export class BanIpModule {
}
