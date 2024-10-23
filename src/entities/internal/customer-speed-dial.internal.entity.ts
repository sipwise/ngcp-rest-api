import {IsNotEmpty, IsNumber} from 'class-validator'

export class CustomerSpeedDial {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
        contractId?: number

    @IsNotEmpty()
        slot: string

    @IsNotEmpty()
        destination: string
}
