import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface BillingNetworkBlockAttributes {
    id?: number;
    network_id: number;
    ip: string;
    mask?: number;
    _ipv4_net_from?: any;
    _ipv4_net_to?: any;
    _ipv6_net_from?: any;
    _ipv6_net_to?: any;
}

@Table({
    tableName: 'billing_network_blocks',
    timestamps: false,
})
export class BillingNetworkBlock extends Model<BillingNetworkBlockAttributes, BillingNetworkBlockAttributes> implements BillingNetworkBlockAttributes {

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
        name: 'bnb_network_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    network_id!: number

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
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv4_from_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    _ipv4_net_from?: any

    @Column({
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv4_to_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    _ipv4_net_to?: any

    @Column({
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv6_from_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    _ipv6_net_from?: any

    @Column({
        allowNull: true,
    })
    @Index({
        name: 'bnb_ipv6_to_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    _ipv6_net_to?: any

}
