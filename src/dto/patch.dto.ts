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
    @ApiProperty()
        op!: PatchOperation

    @ApiProperty()
        path!: string

    @ApiPropertyOptional()
        value: any
}
