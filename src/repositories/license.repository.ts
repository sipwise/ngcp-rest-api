import {promises as fs} from 'fs'
import path from 'path'
import {Injectable} from '@nestjs/common'
import {License as LicenseType, procLicensesLocation} from '../config/constants.config'
import {License} from '../license/license.service'

@Injectable()
export class LicenseRepository {
    private directoryPath = procLicensesLocation

    async readLicenses(): Promise<License> {
        const files = await fs.readdir(this.directoryPath)
        const licenseStatuses = {} as License

        for (const file of files) {
            const filePath = path.join(this.directoryPath, file)
            const data = await fs.readFile(filePath, 'utf8')
            const isEnabled = data.trim() === '1' ? 1 : 0

            if (Object.values(LicenseType).includes(file as LicenseType)) {
                licenseStatuses[file as LicenseType] = isEnabled
            }
        }

        for (const key of Object.values(LicenseType)) {
            if (!(key in licenseStatuses)) {
                licenseStatuses[key] = 0
            }
        }

        return licenseStatuses
    }
}