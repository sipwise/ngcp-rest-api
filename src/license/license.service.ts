import {Inject, Injectable} from '@nestjs/common'
import {LicenseRepository} from '../repositories/license.repository'
import {AppService} from '../app.service'
import {License as LicenseType} from '../config/constants.config'

export type License = {
    [key in LicenseType]: number
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
}
