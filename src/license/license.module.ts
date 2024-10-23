import {Module} from '@nestjs/common'
import {LicenseService} from '~/license/license.service'
import {LicenseRepository} from '~/repositories/license.repository'

@Module({
    providers: [
        LicenseService,
        LicenseRepository,
    ],
    exports: [
        LicenseService,
        LicenseRepository,
    ],
})
export class LicenseModule {
}
