import {Module} from '@nestjs/common'

import {DomainController} from './domain.controller'
import {DomainService} from './domain.service'
import {DomainMariadbRepository} from './repositories/domain.mariadb.repository'
import {DomainRedisRepository} from './repositories/domain.redis.repository'

import {JournalModule} from '~/api/journals/journal.module'
import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        TaskAgentModule,
    ],
    controllers: [DomainController],
    providers: [DomainService, DomainMariadbRepository, DomainRedisRepository],
})
export class DomainModule {
}
