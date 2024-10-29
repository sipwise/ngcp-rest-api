import {IsNumber,IsString} from 'class-validator'

export class DatabaseConfig {
  @IsString()
      host: string

  @IsNumber()
      port: number

  @IsString()
      user: string

  @IsString()
      pass: string

  @IsString()
      dialect: string

  @IsString()
      dbname_test: string

  @IsString()
      dbname_dev: string

  @IsString()
      dbname_prod: string
}