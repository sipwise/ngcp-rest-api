import {inflateSync} from 'zlib'

import {obfuscatePasswordJSON} from '~/helpers/password-obfuscator.helper'

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

    /**
     * Decodes `json` and `json_deflate` content with the secrets masked; formats that can't be
     * decoded (`storable`, `sereal`) and broken content become null, never the raw bytes
     */
    decodeContent(): void {
        if (this.content == null)
            return
        try {
            let json: string
            if (this.content_format == 'application/json' || this.content_format == 'json')
                json = this.content.toString()
            else if (this.content_format == 'json_deflate')
                json = inflateSync(this.content).toString()
            else
                throw new Error(`unsupported content format ${this.content_format}`)
            this.content = json == '' ? null : JSON.parse(json, obfuscatePasswordJSON)
        } catch {
            this.content = null
        }
    }
}
