import {PartialType} from '@nestjs/mapped-types'
import {CustomercontactCreateDto} from './customercontact-create.dto'

export class UpdateContactDto extends PartialType(CustomercontactCreateDto) {
}
