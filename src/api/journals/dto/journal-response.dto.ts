interface JournalResponseDtoAttributes {
    id: number
    operation: string
    resource_name: string
    resource_id: number
    timestamp: number
    username?: string
    content_format
    content?: Uint8Array
}

export class JournalResponseDto implements JournalResponseDtoAttributes {
    content: Uint8Array
    content_format
    id: number
    operation: string
    resource_id: number
    resource_name: string
    timestamp: number
    username: string
}
