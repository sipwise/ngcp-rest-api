import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface CustomerRegisterAttributes {
    id?: number;
    customer_id: number;
    actor?: string;
    type: string;
    data?: string;
}

@Table({
    tableName: 'customer_registers',
    timestamps: false,
})
export class CustomerRegister extends Model<CustomerRegisterAttributes, CustomerRegisterAttributes> implements CustomerRegisterAttributes {

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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customer_id!: number

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
