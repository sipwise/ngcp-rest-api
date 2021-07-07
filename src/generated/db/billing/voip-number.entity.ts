import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Reseller} from './reseller.entity'
import {VoipSubscriber} from './voip-subscriber.entity'

interface VoipNumberAttributes {
    id?: number;
    cc: number;
    ac: string;
    sn: string;
    reseller_id?: number;
    subscriber_id?: number;
    status: string;
    ported: number;
    list_timestamp: Date;
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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id?: number

    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'subscriberid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriber_id?: number

    @Column({
        type: DataType.ENUM('active', 'reserved', 'locked', 'deported'),
    })
    status!: string

    @Column({
        type: DataType.TINYINT,
    })
    ported!: number

    @Column({
        type: DataType.DATE,
    })
    @Index({
        name: 'listts_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    list_timestamp!: Date

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

    @HasMany(() => VoipSubscriber, {
        sourceKey: 'id',
    })
    VoipSubscribers?: VoipSubscriber[]

    @BelongsTo(() => VoipSubscriber)
    VoipSubscriber?: VoipSubscriber

}
