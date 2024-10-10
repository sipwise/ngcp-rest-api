import {IsString, IsNumber} from 'class-validator'

export class RedisConfig {
  @IsString()
      host: string

  @IsNumber()
      port: number
}