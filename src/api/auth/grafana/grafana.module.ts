import {Module} from '@nestjs/common'

import {AuthGrafanaController} from './grafana.controller'

@Module({
    controllers: [AuthGrafanaController],
})
export class AuthGrafanaModule {
}
