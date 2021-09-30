import {IsEnum, IsNotEmpty} from 'class-validator'

export enum ResellerStatus {
    Active = 'active',
    Locked = 'locked',
    Terminated = 'terminated'
}

// TODO: change rtc related fields to required when functionality is implemented in service
export class ResellerBaseDto {
    @IsNotEmpty()
    contract_id: number

    // @IsNotEmpty()
    enable_rtc?: boolean

    name?: string

    rtc_networks?: any //TODO there is no definition in v1 OpenAPI documentation

    @IsEnum(ResellerStatus)
    status?: ResellerStatus
}
