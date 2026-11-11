import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {VoipSubscriberStatus} from '~/entities/internal/voip-subscriber.internal.entity'

const booleanFilter = (column: string): object => ({
    format: (args: string[]): string => ['true', '1'].includes(args[0]) ? '1' : '0',
    where: (param: string): string => `${column} = :${param}`,
})

const conditionFilter = (where: (param: string) => string): object => ({
    format: (args: string[]): string => args[0],
    where,
})

export class SubscriberSearchDto {
    @ApiPropertyOptional({description: 'Subscriber id'})
        id: number
    @ApiPropertyOptional({description: 'SIP username of the subscriber'})
        username: string
    @ApiPropertyOptional({description: 'Web username of the subscriber'})
        webusername: string
    @ApiPropertyOptional({description: 'Domain name'})
        domain: string
    @ApiPropertyOptional({description: 'Customer id'})
        customer_id: number
    @ApiPropertyOptional({enum: [VoipSubscriberStatus.Active, VoipSubscriberStatus.Locked], description: 'Status of the subscriber'})
        status: VoipSubscriberStatus
    @ApiPropertyOptional({description: 'External id of the customer'})
        customer_external_id: string
    @ApiPropertyOptional({description: 'External id of the subscriber'})
        subscriber_external_id: string
    @ApiPropertyOptional({description: 'Subscriber profile id'})
        profile_id: number
    @ApiPropertyOptional({description: 'PBX groups'})
        is_pbx_group: string
    @ApiPropertyOptional({description: 'Administrative subscribers'})
        is_admin: string
    @ApiPropertyOptional({description: 'PBX pilot subscribers'})
        is_pbx_pilot: string
    @ApiPropertyOptional({description: 'Subscribers with this alias (number or device id)'})
        alias: string
    @ApiPropertyOptional({description: 'Reseller of the customer'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Contact of the customer'})
        contact_id: number
    @ApiPropertyOptional({description: 'Primary number as cc, ac and sn'})
        primary_number: string
    @ApiPropertyOptional({description: 'PBX extension of the subscriber'})
        pbx_extension: string
    @ApiPropertyOptional({description: 'Display name of the subscriber'})
        display_name: string
    @ApiPropertyOptional({description: 'Creation time of the subscriber'})
        create_timestamp: string
    @ApiPropertyOptional({description: 'Last modification time of the subscriber'})
        modify_timestamp: string
    @ApiPropertyOptional({description: 'Subscribers created at or after the value'})
        create_timestamp_ge: string
    @ApiPropertyOptional({description: 'Subscribers created at or before the value'})
        create_timestamp_le: string
    @ApiPropertyOptional({description: 'Subscribers modified at or after the value'})
        modify_timestamp_ge: string
    @ApiPropertyOptional({description: 'Subscribers modified at or before the value'})
        modify_timestamp_le: string
    @ApiHideProperty()
        _alias = {
            id: 'subscriber.id',
            username: 'subscriber.username',
            webusername: 'prov.webusername',
            domain: 'domain.domain',
            customer_id: 'subscriber.contract_id',
            status: 'subscriber.status',
            customer_external_id: 'contract.external_id',
            subscriber_external_id: 'subscriber.external_id',
            profile_id: 'prov.profile_id',
            is_pbx_group: booleanFilter('prov.is_pbx_group'),
            is_admin: booleanFilter('prov.admin'),
            is_pbx_pilot: booleanFilter('prov.is_pbx_pilot'),
            alias: conditionFilter(param => 'EXISTS (SELECT 1 FROM provisioning.voip_dbaliases alias' +
                ` WHERE alias.subscriber_id = prov.id AND alias.username LIKE :${param})`),
            reseller_id: 'contact.reseller_id',
            contact_id: 'contract.contact_id',
            primary_number: conditionFilter(param =>
                `CONCAT(primaryNumber.cc, primaryNumber.ac, primaryNumber.sn) LIKE :${param}`),
            pbx_extension: 'prov.pbx_extension',
            display_name: conditionFilter(param => 'EXISTS (SELECT 1 FROM provisioning.voip_usr_preferences dn_pref' +
                ' JOIN provisioning.voip_preferences dn_attr ON dn_attr.id = dn_pref.attribute_id' +
                ` WHERE dn_pref.subscriber_id = prov.id AND dn_attr.attribute = 'display_name' AND dn_pref.value LIKE :${param})`),
            create_timestamp: 'prov.create_timestamp',
            modify_timestamp: 'prov.modify_timestamp',
            create_timestamp_ge: conditionFilter(param => `prov.create_timestamp >= :${param}`),
            create_timestamp_le: conditionFilter(param => `prov.create_timestamp <= :${param}`),
            modify_timestamp_ge: conditionFilter(param => `prov.modify_timestamp >= :${param}`),
            modify_timestamp_le: conditionFilter(param => `prov.modify_timestamp <= :${param}`),
        }
}
