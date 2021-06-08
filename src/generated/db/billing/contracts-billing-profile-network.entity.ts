import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {BillingNetwork} from './billing-network.entity'
import {BillingProfile} from './billing-profile.entity'
import {Contract} from './contract.entity'

@Table({
    tableName: 'contracts_billing_profile_network',
    timestamps: false,
})
export class ContractsBillingProfileNetwork extends Model {

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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contractId!: number

    @ForeignKey(() => BillingProfile)
    @Column({
        field: 'billing_profile_id',
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
    billingProfileId!: number

    @ForeignKey(() => BillingNetwork)
    @Column({
        field: 'billing_network_id',
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
    billingNetworkId?: number

    @Column({
        field: 'start_date',
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    startDate?: Date

    @Column({
        field: 'end_date',
        allowNull: true,
        type: DataType.DATE,
    })
    @Index({
        name: 'cbpn_natural_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    endDate?: Date

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
