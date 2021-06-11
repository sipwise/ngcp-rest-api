import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {ContractsBillingProfileNetwork} from './contracts-billing-profile-network.entity'
import {Reseller} from './reseller.entity'

interface BillingNetworkAttributes {
    id?: number;
    resellerId?: number;
    name: string;
    description: string;
    status: string;
}

@Table({
    tableName: 'billing_networks',
    timestamps: false,
})
export class BillingNetwork extends Model<BillingNetworkAttributes, BillingNetworkAttributes> implements BillingNetworkAttributes {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bn_resname_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'bn_resname_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.STRING(255),
    })
    description!: string

    @Column({
        type: DataType.ENUM('active', 'terminated'),
    })
    status!: string

    @HasMany(() => ContractsBillingProfileNetwork, {
        sourceKey: 'id',
    })
    ContractsBillingProfileNetworks?: ContractsBillingProfileNetwork[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
