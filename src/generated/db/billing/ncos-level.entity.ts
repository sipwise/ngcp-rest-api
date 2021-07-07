import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {NcosLnpList} from './ncos-lnp-list.entity'
import {Reseller} from './reseller.entity'

interface NcosLevelAttributes {
    id?: number;
    reseller_id?: number;
    level: string;
    mode: string;
    local_ac: number;
    intra_pbx: number;
    description?: string;
}

@Table({
    tableName: 'ncos_levels',
    timestamps: false,
})
export class NcosLevel extends Model<NcosLevelAttributes, NcosLevelAttributes> implements NcosLevelAttributes {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reslev_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    reseller_id?: number

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
        type: DataType.TINYINT,
    })
    local_ac!: number

    @Column({
        type: DataType.TINYINT,
    })
    intra_pbx!: number

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
