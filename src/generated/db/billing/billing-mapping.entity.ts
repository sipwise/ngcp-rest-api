import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface BillingMappingAttributes {
    id?: number;
    start_date?: Date;
    end_date?: Date;
    billing_profile_id?: number;
    contract_id: number;
    product_id?: number;
    network_id?: number;
}

@Table({
    tableName: 'billing_mappings',
    timestamps: false,
})
export class BillingMapping extends Model<BillingMappingAttributes, BillingMappingAttributes> implements BillingMappingAttributes {

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
        type: DataType.DATE,
    })
    @Index({
        name: 'billing_mappings_start_date',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    start_date?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    end_date?: Date

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'profileid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_profile_id?: number

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'productid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    product_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bm_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    network_id?: number

}
