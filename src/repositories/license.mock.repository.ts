import {Injectable} from '@nestjs/common'
import {License as LicenseType} from '../config/constants.config'
import {License} from '../license/license.service'

@Injectable()
export class LicenseMockRepository {
    private license: License
    private readonly defaultLicense: License

    constructor() {
        this.license = {
            aof: 1,
            batch_provisioning: 1,
            billing: 1,
            call_recording: 1,
            csc: 1,
            csc_calls: 1,
            csta: 1,
            ct: 1,
            device_provisioning: 1,
            enforce: 1,
            external_lnp: 1,
            fax: 1,
            'gpu-transcoding': 1,
            header_manipulation: 1,
            invoice: 1,
            lcr: 1,
            lnp_importer: 1,
            pbx: 1,
            phonebook: 1,
            'prepaid-inewrate': 1,
            'prepaid-swrate': 1,
            pushd: 1,
            reseller: 1,
            sms: 1,
            tpcc: 1,
            transcoding: 1,
            'voisniff-homer': 1,
            'voisniff-mysql_dump': 1,
            'voisniff-x2x3': 1,
            xmpp: 1,
        }
        this.defaultLicense = Object.assign({}, this.license)
    }

    readLicenses(): License {
        return this.license
    }

    setLicenses(license: License): void {
        this.license = license
    }

    setLicense(licenseType: LicenseType, licenseValue: number): void {
        this.license[licenseType] = licenseValue
    }

    reset(): void {
        this.license = Object.assign({}, this.defaultLicense)
    }
}
