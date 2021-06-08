import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'ncos_pattern_list',
    timestamps: false,
})
export class NcosPatternList extends Model {

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
        field: 'ncos_level_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'levpat_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ncosLevelId!: number

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
