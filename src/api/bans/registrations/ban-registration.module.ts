import {Module,forwardRef} from '@nestjs/common'

import {BanRegistrationController} from './ban-registration.controller'
import {BanRegistrationService} from './ban-registration.service'
import {BanRegistrationRedisRepository} from './repositories/ban-registration.redis.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {ExpandModule} from '~/helpers/expand.module'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    providers: [BanRegistrationService, BanRegistrationRedisRepository],
    controllers: [BanRegistrationController],
})
export class BanRegistrationModule {
}
