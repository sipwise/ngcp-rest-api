export class JournalCreateDto {
    operation!: string;
    resource_name!: string;
    resource_id!: number;
    timestamp!: number;
    username?: string;
    content_format!: string;
    content?: Uint8Array;
}
