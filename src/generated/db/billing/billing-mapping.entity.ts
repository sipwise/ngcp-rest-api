import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'billing_mappings',
    timestamps: false,
})
export class BillingMapping extends Model {

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
        field: 'start_date',
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'billing_mappings_start_date',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    startDate?: Date

    @Column({
        field: 'end_date',
        allowNull: true,
        type: DataType.DATE,
    })
    endDate?: Date

    @Column({
        field: 'billing_profile_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billingProfileId?: number

    @Column({
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractId!: number

    @Column({
        field: 'product_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'productid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    productId?: number

    @Column({
        field: 'network_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bm_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    networkId?: number

}
