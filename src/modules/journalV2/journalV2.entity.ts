import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'api_journal',
    timestamps: false,
})
export class JournalV2 extends Model<JournalV2> {
    @Column({primaryKey: true, autoIncrement: true, type: DataType.INTEGER})
    @Index({
        name: 'PRIMARY', using: 'BTREE', order: 'ASC', unique: true,
    })
    id?: number

    @Column({type: DataType.STRING(127)})
    tx_id!: string

    @Column({type: DataType.STRING(127)})
    @Index({
        name: 'username_req_time_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    username!: string

    @Column({type: DataType.ENUM('post', 'put', 'patch', 'delete')})
    method!: string

    @Column({type: DataType.STRING(255)})
    @Index({
        name: 'resource_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    resource!: string

    @Column({type: DataType.STRING(255)})
    uri!: string

    @Column({allowNull: true, type: DataType.STRING(1024)})
    params?: string

    @Column({type: DataType.DATE})
    @Index({
        name: 'username_req_time_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    request_at!: Date

    @Column({type: DataType.DATE})
    response_at!: Date

    @Column({type: DataType.STRING(127)})
    content_type!: string

    @Column({allowNull: true, type: DataType.BLOB})
    content?: Uint8Array

    @Column({type: DataType.SMALLINT})
    http_code!: number

    @Column({type: DataType.STRING(255)})
    message!: string
}

@Table({
    tableName: 'api_journal_objects',
    timestamps: false,
})
export class JournalObject extends Model<JournalObject> {
    @Column({primaryKey: true, autoIncrement: true, type: DataType.INTEGER})
    @Index({
        name: 'PRIMARY', using: 'BTREE', order: 'ASC', unique: true,
    })
    id?: number

    @Column({type: DataType.INTEGER})
    @Index({
        name: 'journal_object_id_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    journal_id!: number

    @Column({type: DataType.STRING(255)})
    @Index({
        name: 'journal_object_id_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    object!: string

    @Column({type: DataType.INTEGER})
    @Index({
        name: 'journal_object_id_idx', using: 'BTREE', order: 'ASC', unique: false,
    })
    object_id!: number
}
