import {IsString} from 'class-validator'

export class CsvConfig {
    @IsString()
        export_boolean_format: string
}