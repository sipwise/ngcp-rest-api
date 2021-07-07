import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface JournalAttributes {
    id?: number;
    operation: string;
    resource_name: string;
    resource_id: number;
    timestamp: string;
    username?: string;
    content_format: string;
    content?: Uint8Array;
}

@Table({
    tableName: 'journals',
    timestamps: false,
})
export class Journal extends Model<JournalAttributes, JournalAttributes> implements JournalAttributes {

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
        type: DataType.STRING(64),
    })
    @Index({
        name: 'res_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resource_name!: string

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'res_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resource_id!: number

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
        type: DataType.ENUM('storable', 'json', 'json_deflate', 'sereal'),
    })
    content_format!: string

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    content?: Uint8Array

}
