import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'billing_network_blocks',
    timestamps: false,
})
export class BillingNetworkBlock extends Model {

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
        field: 'network_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'bnb_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    networkId!: number

    @Column({
        type: DataType.STRING(39),
    })
    ip!: string

    @Column({
        allowNull: true,
        type: DataType.TINYINT,
    })
    mask?: number

    @Column({
        field: '_ipv4_net_from',
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv4_from_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    ipv4NetFrom?: any

    @Column({
        field: '_ipv4_net_to',
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv4_to_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    ipv4NetTo?: any

    @Column({
        field: '_ipv6_net_from',
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv6_from_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    ipv6NetFrom?: any

    @Column({
        field: '_ipv6_net_to',
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv6_to_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    ipv6NetTo?: any

}
