import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'journals',
    timestamps: false,
})
export class Journal extends Model {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'PRIMARY',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    id?: number

    @Column({
        type: DataType.ENUM('create', 'update', 'delete'),
    })
    @Index({
        name: 'op_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    operation!: string

    @Column({
        field: 'resource_name',
        type: DataType.STRING(64),
    })
    @Index({
        name: 'res_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resourceName!: string

    @Column({
        field: 'resource_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'res_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resourceId!: number

    @Column({
        type: DataType.DECIMAL(13, 3),
    })
    @Index({
        name: 'ts_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    timestamp!: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    username?: string

    @Column({
        field: 'content_format',
        type: DataType.ENUM('storable', 'json', 'json_deflate', 'sereal'),
    })
    contentFormat!: string

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    content?: Uint8Array

}
