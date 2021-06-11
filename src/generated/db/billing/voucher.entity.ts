import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {ProfilePackage} from './profile-package.entity'
import {Reseller} from './reseller.entity'
import {VoipSubscriber} from './voip-subscriber.entity'

interface VoucherAttributes {
    id?: number;
    code: string;
    amount: number;
    resellerId: number;
    customerId?: number;
    packageId?: number;
    usedBySubscriberId?: number;
    createdAt: Date;
    usedAt: Date;
    validUntil: Date;
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
        field: 'reseller_id',
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
    resellerId!: number

    @ForeignKey(() => Contract)
    @Column({
        field: 'customer_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'customer_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    customerId?: number

    @ForeignKey(() => ProfilePackage)
    @Column({
        field: 'package_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'vouchers_package_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    packageId?: number

    @ForeignKey(() => VoipSubscriber)
    @Column({
        field: 'used_by_subscriber_id',
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
    usedBySubscriberId?: number

    @Column({
        field: 'created_at',
        type: DataType.DATE,
    })
    createdAt!: Date

    @Column({
        field: 'used_at',
        type: DataType.DATE,
    })
    usedAt!: Date

    @Column({
        field: 'valid_until',
        type: DataType.DATE,
    })
    @Index({
        name: 'code_sub_valid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    validUntil!: Date

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => ProfilePackage)
    ProfilePackage?: ProfilePackage

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

    @BelongsTo(() => VoipSubscriber)
    VoipSubscriber?: VoipSubscriber

}
