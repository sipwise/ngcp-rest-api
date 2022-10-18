import {Module} from '@nestjs/common'
import {ClearCallCountersService} from './clearcallcounters.service'
import {ClearCallCountersController} from './clearcallcounters.controller'

@Module({
    providers: [ClearCallCountersService],
    controllers: [ClearCallCountersController],
    exports: [ClearCallCountersService],
})
export class ClearCallCountersModule {
}