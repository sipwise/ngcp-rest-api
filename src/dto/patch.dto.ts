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
        // TODO: Fix any type, can we use never here?
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
}
