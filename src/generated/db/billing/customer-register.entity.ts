import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'customer_registers',
    timestamps: false,
})
export class CustomerRegister extends Model {

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
        field: 'customer_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customerId!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(15),
    })
    actor?: string

    @Column({
        type: DataType.STRING(31),
    })
    type!: string

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    data?: string

}
