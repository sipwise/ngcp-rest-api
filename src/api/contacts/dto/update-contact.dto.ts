import {PartialType} from '@nestjs/mapped-types'
import {ContactCreateDto} from './contact-create.dto'

export class UpdateContactDto extends PartialType(ContactCreateDto) {
}
