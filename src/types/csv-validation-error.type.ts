import {ValidationError} from 'class-validator'

export interface CsvValidationError {
    row: number
    error: ValidationError[]
}