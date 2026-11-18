import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'

enum PatchOperation {
    Add = 'add',
    Remove = 'remove',
    Replace = 'replace',
    Copy = 'copy',
    Move = 'move',
    Test = 'test'
}

export class PatchDto {
    @ApiProperty({description: 'Operation (RFC 6902)'})
        op!: PatchOperation

    @ApiProperty({description: 'JSON Pointer to the field to change, e.g. `/email`'})
        path!: string

    @ApiPropertyOptional({description: 'New value of the field, any JSON value: add, replace, test'})
        // TODO: Fix any type, can we use never here?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any

    @ApiPropertyOptional({description: 'JSON Pointer to the source field: copy, move'})
        from?: string
}
