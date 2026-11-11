import {Type} from 'class-transformer'
import {IsNumber, IsOptional, ValidateNested} from 'class-validator'

import {CommonConfig} from './common.config.schema'
import {CsvConfig} from './csv.config.schema'
import {DatabaseConfig} from './database.config.schema'
import {FeaturesConfig} from './features.config.schema'
import {FileShareConfig} from './fileshare.config.schema'
import {GeneralConfig} from './general.config.schema'
import {MultiSiteConfig} from './multisite.config.schema'
import {NumberManagementConfig} from './numbermanagement.config.schema'
import {PrivilegesConfig} from './privileges.config.schema'
import {RedisConfig} from './redis.config.schema'
import {SecurityConfig} from './security.config.schema'
import {SipConfig} from './sip.config.schema'
import {SSLConfig} from './ssl.config.schema'

export class AppConfig {
    @ValidateNested()
    @Type(() => GeneralConfig)
        general: GeneralConfig

    @ValidateNested()
    @Type(() => DatabaseConfig)
        database: DatabaseConfig

    @ValidateNested()
    @Type(() => RedisConfig)
        redis: RedisConfig

    @ValidateNested()
    @Type(() => CommonConfig)
        common: CommonConfig

    @ValidateNested()
    @Type(() => FileShareConfig)
        fileshare: FileShareConfig

    @ValidateNested()
    @Type(() => SSLConfig)
        ssl: SSLConfig

    @ValidateNested()
    @Type(() => CsvConfig)
        csv: CsvConfig

    @ValidateNested()
    @Type(() => SecurityConfig)
        security: SecurityConfig

    @ValidateNested()
    @Type(() => SipConfig)
        sip: SipConfig

    @ValidateNested()
    @Type(() => MultiSiteConfig)
        multisite: MultiSiteConfig

    @ValidateNested()
    @Type(() => FeaturesConfig)
        features: FeaturesConfig

    @ValidateNested()
    @Type(() => NumberManagementConfig)
        numbermanagement: NumberManagementConfig

    @ValidateNested()
    @Type(() => PrivilegesConfig)
        privileges: PrivilegesConfig

    @IsNumber()
    @IsOptional()
        post_return_max_link?: number
}
