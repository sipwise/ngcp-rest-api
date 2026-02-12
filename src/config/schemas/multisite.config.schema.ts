import {Type} from 'class-transformer'
import {IsInt, IsOptional, ValidateNested} from 'class-validator'

export class MultiSiteSitesConfig {
    [key: number]: {
        name: string
        role: string
    }
}

export class MultiSiteConfig {
    @IsOptional()
    @IsInt()
        site_id?: number

    @IsOptional()
    @ValidateNested()
    @Type(() => MultiSiteSitesConfig)
        sites: MultiSiteSitesConfig
}