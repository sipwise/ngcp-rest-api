import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface NcosPatternListAttributes {
    id?: number;
    ncos_level_id: number;
    pattern: string;
    description?: string;
}

@Table({
    tableName: 'ncos_pattern_list',
    timestamps: false,
})
export class NcosPatternList extends Model<NcosPatternListAttributes, NcosPatternListAttributes> implements NcosPatternListAttributes {

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
        name: 'levpat_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ncos_level_id!: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'levpat_idx',
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
