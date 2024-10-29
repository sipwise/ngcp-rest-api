import {IsNumber,IsString} from 'class-validator'

export class RedisConfig {
  @IsString()
      host: string

  @IsNumber()
      port: number
}