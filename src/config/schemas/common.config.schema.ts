import {IsNumber, IsString} from 'class-validator'

export class CommonConfig {
    @IsString()
        jwt_key: string

    @IsString()
        token_expire: string

    @IsString()
        bearer: string

    @IsNumber()
        api_default_query_page: number

    @IsString()
        api_default_query_page_name: string

    @IsNumber()
        api_default_query_rows: number

    @IsString()
        api_default_query_rows_name: string

    @IsString()
        api_prefix: string

    @IsNumber()
        api_port: number

    @IsNumber()
        workers: number

    @IsNumber()
        post_many_return_link_max: number
}