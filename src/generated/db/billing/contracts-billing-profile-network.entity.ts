import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {BillingNetwork} from './billing-network.entity'
import {BillingProfile} from './billing-profile.entity'
import {Contract} from './contract.entity'

interface ContractsBillingProfileNetworkAttributes {
    id?: number;
    contract_id: number;
    billing_profile_id: number;
    billing_network_id?: number;
    start_date?: Date;
    end_date?: Date;
    base: number;
}

@Table({
    tableName: 'contracts_billing_profile_network',
    timestamps: false,
})
export class ContractsBillingProfileNetwork extends Model<ContractsBillingProfileNetworkAttributes, ContractsBillingProfileNetworkAttributes> implements ContractsBillingProfileNetworkAttributes {

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

    @ForeignKey(() => Contract)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contract_id!: number

    @ForeignKey(() => BillingProfile)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'cbpn_pid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_profile_id!: number

    @ForeignKey(() => BillingNetwork)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'cbpn_nid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    billing_network_id?: number

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    start_date?: Date

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    end_date?: Date

    @Column({
        type: DataType.TINYINT,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    base!: number

    @BelongsTo(() => BillingNetwork)
    BillingNetwork?: BillingNetwork

    @BelongsTo(() => BillingProfile)
    BillingProfile?: BillingProfile

    @BelongsTo(() => Contract)
    Contract?: Contract

}
