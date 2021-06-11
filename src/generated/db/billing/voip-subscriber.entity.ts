import {BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Domain} from './domain.entity'
import {VoipNumber} from './voip-number.entity'
import {Voucher} from './voucher.entity'

interface VoipSubscriberAttributes {
    id?: number;
    contractId: number;
    uuid: string;
    username: string;
    domainId: number;
    status: string;
    primaryNumberId?: number;
    externalId?: string;
    contactId?: number;
}

@Table({
    tableName: 'voip_subscribers',
    timestamps: false,
})
export class VoipSubscriber extends Model<VoipSubscriberAttributes, VoipSubscriberAttributes> implements VoipSubscriberAttributes {

    @ForeignKey(() => VoipNumber)
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
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contractId!: number

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
        field: 'domain_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'domainid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    domainId!: number

    @Column({
        type: DataType.ENUM('active', 'locked', 'terminated'),
    })
    status!: string

    @ForeignKey(() => VoipNumber)
    @Column({
        field: 'primary_number_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'pnumid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    primaryNumberId?: number

    @Column({
        field: 'external_id',
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    externalId?: string

    @Column({
        field: 'contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    contactId?: number

    @BelongsTo(() => Contract)
    Contract?: Contract

    @BelongsTo(() => Domain)
    Domain?: Domain

    @BelongsTo(() => VoipNumber)
    VoipNumber?: VoipNumber

    // @BelongsTo(() => VoipNumber)
    // VoipNumber?: VoipNumber
    //
    // @HasOne(() => VoipNumber, {
    //     sourceKey: 'id',
    // })
    // VoipNumber?: VoipNumber

    @HasMany(() => Voucher, {
        sourceKey: 'id',
    })
    Vouchers?: Voucher[]

}
