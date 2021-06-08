import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {NcosLnpList} from './ncos-lnp-list.entity'
import {Reseller} from './reseller.entity'

@Table({
    tableName: 'ncos_levels',
    timestamps: false,
})
export class NcosLevel extends Model {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reslev_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(31),
    })
    @Index({
        name: 'reslev_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    level!: string

    @Column({
        type: DataType.ENUM('blacklist', 'whitelist'),
    })
    mode!: string

    @Column({
        field: 'local_ac',
        type: DataType.TINYINT,
    })
    localAc!: number

    @Column({
        field: 'intra_pbx',
        type: DataType.TINYINT,
    })
    intraPbx!: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    description?: string

    @HasMany(() => NcosLnpList, {
        sourceKey: 'id',
    })
    NcosLnpLists?: NcosLnpList[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
