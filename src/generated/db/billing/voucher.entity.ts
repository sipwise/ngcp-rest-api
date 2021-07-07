import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {ProfilePackage} from './profile-package.entity'
import {Reseller} from './reseller.entity'
import {VoipSubscriber} from './voip-subscriber.entity'

interface VoucherAttributes {
    id?: number;
    code: string;
    amount: number;
    reseller_id: number;
    customer_id?: number;
    package_id?: number;
    used_by_subscriber_id?: number;
    created_at: Date;
    used_at: Date;
    valid_until: Date;
}

@Table({
    tableName: 'vouchers',
    timestamps: false,
})
export class Voucher extends Model<VoucherAttributes, VoucherAttributes> implements VoucherAttributes {

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
        type: DataType.STRING(255),
    })
    @Index({
        name: 'vouchers_rescode_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'code_sub_valid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    code!: string

    @Column({
        type: DataType.DOUBLE(22),
    })
    amount!: number

    @ForeignKey(() => Reseller)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'vouchers_rescode_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'reseller_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id!: number

    @ForeignKey(() => Contract)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customer_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customer_id?: number

    @ForeignKey(() => ProfilePackage)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'vouchers_package_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    package_id?: number

    @ForeignKey(() => VoipSubscriber)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'code_sub_valid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    @Index({
        name: 'subscriber_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    used_by_subscriber_id?: number

    @Column({
        type: DataType.DATE,
    })
    created_at!: Date

    @Column({
        type: DataType.DATE,
    })
    used_at!: Date

    @Column({
        type: DataType.DATE,
    })
    @Index({
        name: 'code_sub_valid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    valid_until!: Date

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => ProfilePackage)
    ProfilePackage?: ProfilePackage

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

    @BelongsTo(() => VoipSubscriber)
    VoipSubscriber?: VoipSubscriber

}
