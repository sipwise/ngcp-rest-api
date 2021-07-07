import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface NcosLnpPatternListAttributes {
    id?: number;
    ncos_lnp_list_id: number;
    pattern: string;
    description?: string;
}

@Table({
    tableName: 'ncos_lnp_pattern_list',
    timestamps: false,
})
export class NcosLnpPatternList extends Model<NcosLnpPatternListAttributes, NcosLnpPatternListAttributes> implements NcosLnpPatternListAttributes {

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
        name: 'listpat_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ncos_lnp_list_id!: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'listpat_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    pattern!: string

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    description?: string

}
