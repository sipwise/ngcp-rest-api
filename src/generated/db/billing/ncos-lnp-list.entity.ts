import {BelongsTo, Column, DataType, ForeignKey, Index, Model, Table} from 'sequelize-typescript'
import {LnpProvider} from './lnp-provider.entity'
import {NcosLevel} from './ncos-level.entity'

interface NcosLnpListAttributes {
    id?: number;
    ncosLevelId: number;
    lnpProviderId: number;
    description?: string;
}

@Table({
    tableName: 'ncos_lnp_list',
    timestamps: false,
})
export class NcosLnpList extends Model<NcosLnpListAttributes, NcosLnpListAttributes> implements NcosLnpListAttributes {

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

    @ForeignKey(() => NcosLevel)
    @Column({
        field: 'ncos_level_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'levpro_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ncosLevelId!: number

    @ForeignKey(() => LnpProvider)
    @Column({
        field: 'lnp_provider_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'levpro_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'c_l_l_lnpproid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    lnpProviderId!: number

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    description?: string

    @BelongsTo(() => LnpProvider)
    LnpProvider?: LnpProvider

    @BelongsTo(() => NcosLevel)
    NcosLevel?: NcosLevel

}
