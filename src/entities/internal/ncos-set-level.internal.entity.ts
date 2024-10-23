import {IsNotEmpty, IsOptional} from 'class-validator'

export class NCOSSetLevel {
    @IsNotEmpty()
        id: number

    @IsNotEmpty()
        ncosSetId: number

    @IsNotEmpty()
        ncosLevelId: number

    @IsOptional()
        level?: string
}
