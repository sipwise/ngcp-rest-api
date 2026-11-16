import {Injectable} from '@nestjs/common'

import {db} from '~/entities'

/**
 * Stored timezone names of the owner chains (billing.v_*_timezone views), as stored: they may be
 * 'localtime'/'SYSTEM' or invalid, see storedTimezone()
 */
@Injectable()
export class TimezoneRepository {
    async readSubscriberTimezone(subscriberId: number): Promise<string | undefined> {
        const row = await db.billing.VSubscriberTimezone.findOneBy({subscriber_id: subscriberId})
        return row?.name ?? undefined
    }

    async readContractTimezone(contractId: number): Promise<string | undefined> {
        const row = await db.billing.VContractTimezone.findOneBy({contract_id: contractId})
        return row?.name ?? undefined
    }

    async readResellerTimezone(resellerId: number): Promise<string | undefined> {
        const row = await db.billing.VResellerTimezone.findOneBy({reseller_id: resellerId})
        return row?.name ?? undefined
    }
}
