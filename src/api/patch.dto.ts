enum PatchOperation {
    Add = 'add',
    Remove = 'remove',
    Replace = 'replace',
    Copy = 'copy',
    Move = 'move',
    Test = 'test'
}

export class PatchDto {
    op!: PatchOperation
    path!: string
    value: any
}
