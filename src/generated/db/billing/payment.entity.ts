import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'payments',
    timestamps: false,
})
export class Payment extends Model {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    amount?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    type?: string

    @Column({
        allowNull: true,
        type: DataType.ENUM('init', 'transact', 'failed', 'success'),
    })
    @Index({
        name: 'state_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    state?: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'mpaytid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    mpaytid?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    @Index({
        name: 'status_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    status?: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    errno?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(63),
    })
    returncode?: string

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    externalstatus?: string

    @Column({
        field: 'modify_timestamp',
        type: DataType.DATE,
    })
    modifyTimestamp!: Date

    @Column({
        field: 'create_timestamp',
        type: DataType.DATE,
    })
    createTimestamp!: Date

}
