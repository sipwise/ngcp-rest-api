import {Type} from 'class-transformer'
import {IsNumber, IsOptional, ValidateNested} from 'class-validator'

import {CommonConfig} from './common.config.schema'
import {CsvConfig} from './csv.config.schema'
import {DatabaseConfig} from './database.config.schema'
import {FileShareConfig} from './fileshare.config.schema'
import {GeneralConfig} from './general.config.schema'
import {LegacyConfig} from './legacy.config.schema'
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
    @Type(() => LegacyConfig)
        legacy: LegacyConfig

    @ValidateNested()
    @Type(() => CsvConfig)
        csv: CsvConfig

    @ValidateNested()
    @Type(() => SecurityConfig)
        security: SecurityConfig

    @ValidateNested()
    @Type(() => SipConfig)
        sip: SipConfig

    @IsNumber()
    @IsOptional()
        post_return_max_link?: number
}
