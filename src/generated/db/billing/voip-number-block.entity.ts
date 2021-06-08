import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'voip_number_blocks',
    timestamps: false,
})
export class VoipNumberBlock extends Model {

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
        name: 'prefix_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    cc!: number

    @Column({
        type: DataType.STRING(7),
    })
    @Index({
        name: 'prefix_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    ac!: string

    @Column({
        field: 'sn_prefix',
        type: DataType.STRING(31),
    })
    @Index({
        name: 'prefix_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    snPrefix!: string

    @Column({
        field: 'sn_length',
        type: DataType.TINYINT,
    })
    snLength!: number

    @Column({
        type: DataType.TINYINT,
    })
    allocable!: number

    @Column({
        type: DataType.TINYINT,
    })
    authoritative!: number

}
