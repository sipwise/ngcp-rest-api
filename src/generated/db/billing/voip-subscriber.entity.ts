import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Domain} from './domain.entity'
import {VoipNumber} from './voip-number.entity'
import {Voucher} from './voucher.entity'

interface VoipSubscriberAttributes {
    id?: number;
    contract_id: number;
    uuid: string;
    username: string;
    domain_id: number;
    status: string;
    primary_number_id?: number;
    external_id?: string;
    contact_id?: number;
}

@Table({
    tableName: 'voip_subscribers',
    timestamps: false,
})
export class VoipSubscriber extends Model<VoipSubscriberAttributes, VoipSubscriberAttributes> implements VoipSubscriberAttributes {

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
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_id!: number

    @Column({
        type: DataType.CHAR(36),
    })
    @Index({
        name: 'uuid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    uuid!: string

    @Column({
        type: DataType.STRING(127),
    })
    @Index({
        name: 'username_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    username!: string

    @ForeignKey(() => Domain)
    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'domainid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    domain_id!: number

    @Column({
        type: DataType.ENUM('active', 'locked', 'terminated'),
    })
    status!: string

    @ForeignKey(() => VoipNumber)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pnumid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    primary_number_id?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    external_id?: string

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    contact_id?: number

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => Domain)
    Domain?: Domain

    @BelongsTo(() => VoipNumber)
    VoipNumber?: VoipNumber

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

    // @HasOne(() => VoipNumber, {
    //   sourceKey: 'id'
    // })
    // VoipNumber?: VoipNumber;

}
