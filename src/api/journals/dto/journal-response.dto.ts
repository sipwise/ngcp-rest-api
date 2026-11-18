import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'
import {ResponseDtoOptions} from '~/types/response-dto-options'

export class JournalResponseDto extends ResponseDto {
    @ApiProperty({description: 'Id of the journal entry'})
        id: number
    @ApiPropertyOptional({description: 'Resource data written by the operation, passwords masked; null when it can not be decoded'})
        content?: string | Buffer
    @ApiProperty({description: 'Format the content is stored in, e.g. `json` or `json_deflate`'})
        content_format: string
    @ApiProperty({description: 'Operation on the resource: `create`, `update` or `delete`'})
        operation: string
    @ApiProperty({description: 'Reseller of the user who made the change'})
        reseller_id: number
    @ApiProperty({description: 'Id of the changed resource'})
        resource_id: number
    @ApiProperty({description: 'Resource path without prefix and ids, e.g. `customers/phonebook`'})
        resource_name: string
    @ApiProperty({description: 'Role of the user who made the change'})
        role: string | null
    @ApiProperty({description: 'Time of the change, Unix time in seconds with milliseconds'})
        timestamp: number
    @ApiProperty({description: 'Id of the request in the server log'})
        tx_id: string
    @ApiProperty({description: 'Login of the user who made the change'})
        username: string
    @ApiProperty({description: 'Id of the admin or subscriber who made the change'})
        user_id: number

    constructor(journal: internal.Journal, options?: ResponseDtoOptions) {
        super(options)
        journal.decodeContent()

        this.id = journal.id
        this.reseller_id = journal.reseller_id
        this.role = journal.role
        this.tx_id = journal.tx_id
        this.user_id = journal.user_id
        this.content = journal.content
        this.content_format = journal.content_format
        this.operation = journal.operation
        this.resource_id = journal.resource_id
        this.resource_name = journal.resource_name
        this.timestamp = journal.timestamp
        this.username = journal.username
    }
}
