import {IsNotEmpty, IsNumber} from 'class-validator'

export class NCOSSet {
    @IsNumber()
    @IsNotEmpty()
        id: number

    @IsNumber()
    @IsNotEmpty()
        resellerId: number

    @IsNotEmpty()
        name: string

    description?: string

    exposeToCustomer: boolean
}