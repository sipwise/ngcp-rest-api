import {Inject, Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {License as LicenseType} from '~/config/constants.config'
import {LicenseRepository} from '~/repositories/license.repository'

export type License = {
    [key in LicenseType]: number
}

export type LicenseCounter = 'subscribers' | 'pbx_subscribers' | 'pbx_groups'

/**
 * Platform limit and current usage, -1 = unlimited/unknown
 */
export interface LicenseLimit {
    max: number
    current: number
}

@Injectable()
export class LicenseService {
    constructor(
        private readonly app: AppService,
        @Inject(LicenseRepository) private readonly licenseRepo: LicenseRepository,
    ) {

    }
    public async areLicensesActive(licenses: string[]): Promise<boolean> {
        const mappings = await this.licenseRepo.readLicenses()
        return licenses.some((license) => mappings[license] === 1)
    }

    async readLimit(name: LicenseCounter): Promise<LicenseLimit> {
        return {
            max: await this.licenseRepo.readCount('max', name),
            current: await this.licenseRepo.readCount('current', name),
        }
    }
}
