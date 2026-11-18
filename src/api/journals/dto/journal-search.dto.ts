import {ApiHideProperty, ApiPropertyOptional} from '@nestjs/swagger'

export class JournalSearchDto {
    @ApiPropertyOptional({description: 'Resource data written by the operation'})
        content?: string | Buffer
    @ApiPropertyOptional({description: 'Format the content is stored in, e.g. `json` or `json_deflate`'})
        content_format: string
    @ApiPropertyOptional({description: 'Operation on the resource: `create`, `update` or `delete`'})
        operation: string
    @ApiPropertyOptional({description: 'Reseller of the user who made the change'})
        reseller_id: number
    @ApiPropertyOptional({description: 'Id of the changed resource'})
        resource_id: number
    @ApiPropertyOptional({description: 'Resource path without prefix and ids, e.g. `customers/phonebook`'})
        resource_name: string
    @ApiPropertyOptional({description: 'Role of the user who made the change'})
        role: string | null
    @ApiPropertyOptional({description: 'Time of the change, Unix time in seconds with milliseconds'})
        timestamp: number
    @ApiPropertyOptional({description: 'Id of the request in the server log'})
        tx_id: string
    @ApiPropertyOptional({description: 'Login of the user who made the change'})
        username: string
    @ApiPropertyOptional({description: 'Id of the admin or subscriber who made the change'})
        user_id: number
    @ApiPropertyOptional({description: 'Id of the journal entry'})
        id: number
    @ApiHideProperty()
        _alias = {
            id: 'journal.id',
            role: 'role.role',
        }
}
