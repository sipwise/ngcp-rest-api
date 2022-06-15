interface JournalInterface {
    id?: number
    content?: string | Buffer
    content_format: string
    operation: string
    reseller_id: number
    resource_id: number
    resource_name: string
    role: string | null
    role_id: number | null
    timestamp: number
    tx_id: string
    username: string
    user_id: number
}

export class Journal implements JournalInterface {
    id: number
    content?: string | Buffer
    content_format: string
    operation: string
    reseller_id: number
    resource_id: number
    resource_name: string
    role: string | null
    role_id: number | null
    timestamp: number
    tx_id: string
    username: string
    user_id: number

    static create(data: JournalInterface): Journal {
        const journal = new Journal()

        Object.keys(data).map(key => {
            journal[key] = data[key]
        })
        return journal
    }

    decodeContent() {
        if (this.content_format == 'application/json' || this.content_format == 'json')  {
            this.content = this.content && this.content instanceof Buffer
                ? JSON.parse(this.content.toString())
                : this.content
        }
    }
}
