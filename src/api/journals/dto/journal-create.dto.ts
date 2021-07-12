interface JournalCreateDtoAttributes {
    operation: string
    resource_name: string
    resource_id: number
    timestamp: number
    username?: string
    content_format
    content?: Uint8Array
}

export class JournalCreateDto implements JournalCreateDtoAttributes {
    operation!: string
    resource_name!: string
    resource_id!: number
    timestamp!: number
    username?: string
    content_format!: string
    content?: Uint8Array
}
