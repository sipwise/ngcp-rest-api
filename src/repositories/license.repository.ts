import {promises as fs} from 'fs'
import path from 'path'
import {Injectable} from '@nestjs/common'
import {License as LicenseType, procLicensesLocation} from '~/config/constants.config'
import {License} from '~/license/license.service'

@Injectable()
export class LicenseRepository {
    private readonly directoryPath = procLicensesLocation

    async readLicenses(): Promise<License> {
        const licenseStatuses = {} as License
        for (const key of Object.values(LicenseType)) {
            licenseStatuses[key] = 0
        }

        try {
            const files = await fs.readdir(this.directoryPath)
            for (const file of files) {
                const filePath = path.join(this.directoryPath, file)
                try {
                    const data = await fs.readFile(filePath, 'utf8')
                    const isEnabled = data.trim() === '1' ? 1 : 0
                    if (Object.values(LicenseType).includes(file as LicenseType)) {
                        licenseStatuses[file as LicenseType] = isEnabled
                    }
                } catch {
                    continue
                }
            }
            return licenseStatuses
        } catch {
            return licenseStatuses
        }
    }
}