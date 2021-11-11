import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsEmail, IsNotEmpty} from 'class-validator'
import {RBAC_ROLES} from '../../../config/constants.config'
import {AdminCreateDto} from './admin-create.dto'

export class AdminBaseDto extends AdminCreateDto{
    id: number
}
