import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {conditionFilter} from './subscriber-search.dto'

import {InvalidParameterException, errorMessage} from '~/helpers/errors.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'

const devIdFilter = {
    format: (args: string[]): string => {
        const isDevId = SearchLogic.toBoolean(args[0])
        if (isDevId === undefined) {
            const error = errorMessage('INVALID_BOOLEAN')
            throw new InvalidParameterException([{parameter: 'is_devid', code: error.errorCode, message: `is_devid ${error.message}`}])
        }
        return isDevId ? '1' : '0'
    },
    where: (param: string): string => 'EXISTS (SELECT 1 FROM billing.voip_subscribers devid_billing'
        + ' JOIN provisioning.voip_subscribers devid_prov ON devid_prov.uuid = devid_billing.uuid'
        + ' JOIN provisioning.voip_dbaliases devid ON devid.subscriber_id = devid_prov.id'
        + ' WHERE devid_billing.id = number.subscriber_id AND devid.is_devid = 1'
        + ` AND devid.username = CONCAT(number.cc, number.ac, number.sn)) = :${param}`,
}

export class SubscriberAliasNumberSearchDto {
    @ApiPropertyOptional({description: 'Id of the number'})
        number_id: number
    @ApiPropertyOptional({description: 'Country code'})
        cc: number
    @ApiPropertyOptional({description: 'Area code'})
        ac: string
    @ApiPropertyOptional({description: 'Subscriber number'})
        sn: string
    @ApiPropertyOptional({description: 'Whole number as cc, ac and sn'})
        number: string
    @ApiPropertyOptional({description: 'Device id aliases'})
        is_devid: boolean
    @ApiHideProperty()
        _alias = {
            number_id: 'number.id',
            cc: 'number.cc',
            ac: 'number.ac',
            sn: 'number.sn',
            number: conditionFilter(param => `CONCAT(number.cc, number.ac, number.sn) LIKE :${param}`),
            is_devid: devIdFilter,
        }
}
