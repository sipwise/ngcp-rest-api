import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'ncos_lnp_pattern_list',
    timestamps: false,
})
export class NcosLnpPatternList extends Model {

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
        field: 'ncos_lnp_list_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'listpat_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ncosLnpListId!: number

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
