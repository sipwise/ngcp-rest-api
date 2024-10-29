import {ApiHideProperty, ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

import {ResellerResponseDto} from '~/api/resellers/dto/reseller-response.dto'
import {ResponseDto} from '~/dto/response.dto'
import {internal} from '~/entities'

export class JournalResponseDto implements ResponseDto {
    @ApiProperty()
        id: number
    @ApiPropertyOptional()
        content?: string | Buffer
    @ApiProperty()
        content_format: string
    @ApiProperty()
        operation: string
    @ApiProperty()
        reseller_id: number
    @ApiHideProperty()
        reseller_id_expand?: ResellerResponseDto
    @ApiProperty()
        resource_id: number
    @ApiProperty()
        resource_name: string
    @ApiProperty()
        role: string | null
    @ApiProperty()
        timestamp: number
    @ApiProperty()
        tx_id: string
    @ApiProperty()
        username: string
    @ApiProperty()
        user_id: number

    constructor(journal: internal.Journal) {
        try {
            journal.decodeContent()
        } catch {/*TODO: empty*/}

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
