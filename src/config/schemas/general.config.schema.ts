import {IsString} from 'class-validator'

export class GeneralConfig {
  @IsString()
      companyname: string
}