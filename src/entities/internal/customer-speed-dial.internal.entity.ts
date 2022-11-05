import {Type} from "class-transformer"
import {IsArray, IsNotEmpty, IsNumber, ValidateNested} from "class-validator"

export class CustomerSpeedDialEntry {
    id?: number
    slot: string
    destination: string
}

export class CustomerSpeedDial {
    @IsNotEmpty()
    @IsNumber()
    contract_id?: number

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomerSpeedDialEntry)
    speeddials?: CustomerSpeedDialEntry[]
}
