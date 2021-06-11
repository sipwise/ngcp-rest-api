import {BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Index, Model, Table} from 'sequelize-typescript'
import {Reseller} from './reseller.entity'
import {VoipSubscriber} from './voip-subscriber.entity'

interface VoipNumberAttributes {
    id?: number;
    cc: number;
    ac: string;
    sn: string;
    resellerId?: number;
    subscriberId?: number;
    status: string;
    ported: number;
    listTimestamp: Date;
}

@Table({
    tableName: 'voip_numbers',
    timestamps: false,
})
export class VoipNumber extends Model<VoipNumberAttributes, VoipNumberAttributes> implements VoipNumberAttributes {

    @ForeignKey(() => VoipSubscriber)
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
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    cc!: number

    @Column({
        type: DataType.STRING(7),
    })
    @Index({
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ac!: string

    @Column({
        type: DataType.STRING(31),
    })
    @Index({
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    sn!: string

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

    @Column({
        field: 'subscriber_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'subscriberid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriberId?: number

    @Column({
        type: DataType.ENUM('active', 'reserved', 'locked', 'deported'),
    })
    status!: string

    @Column({
        type: DataType.TINYINT,
    })
    ported!: number

    @Column({
        field: 'list_timestamp',
        type: DataType.DATE,
    })
    @Index({
        name: 'listts_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    listTimestamp!: Date

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

    @HasOne(() => VoipSubscriber, {
        sourceKey: 'id',
    })
    VoipSubscriber?: VoipSubscriber

    @HasMany(() => VoipSubscriber, {
        sourceKey: 'id',
    })
    VoipSubscribers?: VoipSubscriber[]

    // @BelongsTo(() => VoipSubscriber)
    // VoipSubscriber?: VoipSubscriber

}
