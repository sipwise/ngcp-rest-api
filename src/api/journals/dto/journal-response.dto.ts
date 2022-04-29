import {internal} from './../../../entities'

export class JournalResponseDto {
    id: number
    content?: string | Buffer
    content_format: string
    operation: string
    reseller_id: number
    resource_id: number
    resource_name: string
    role_id: number | null
    timestamp: number
    tx_id: string
    username: string
    user_id: number

    constructor(journal: internal.Journal) {
        try {
            journal.decodeContent()
        } catch (e) {
        }

        this.id = journal.id
        this.reseller_id = journal.reseller_id
        this.role_id = journal.role_id
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
