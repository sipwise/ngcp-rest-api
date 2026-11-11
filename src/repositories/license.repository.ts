import {promises as fs} from 'fs'
import path from 'path'

import {Injectable} from '@nestjs/common'

import {License as LicenseType, procLicensesLocation} from '~/config/constants.config'
import {License, LicenseCounter} from '~/license/license.service'

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

    /**
     * Platform license counter from /proc/ngcp/<kind>_<name>; -1 when unlimited or unknown.
     * Not read in development, where there is no NGCP platform: unlimited.
     */
    async readCount(kind: 'max' | 'current', name: LicenseCounter): Promise<number> {
        if (process.env.NODE_ENV == 'development')
            return -1
        try {
            const value = (await fs.readFile(`/proc/ngcp/${kind}_${name}`, 'utf8')).trim()
            return /^\d+$/.test(value) ? +value : -1
        } catch {
            return -1
        }
    }
}
