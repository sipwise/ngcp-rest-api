import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface VoipNumberBlockAttributes {
    id?: number;
    cc: number;
    ac: string;
    sn_prefix: string;
    sn_length: number;
    allocable: number;
    authoritative: number;
}

@Table({
    tableName: 'voip_number_blocks',
    timestamps: false,
})
export class VoipNumberBlock extends Model<VoipNumberBlockAttributes, VoipNumberBlockAttributes> implements VoipNumberBlockAttributes {

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
        type: DataType.STRING(31),
    })
    @Index({
        name: 'prefix_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    sn_prefix!: string

    @Column({
        type: DataType.TINYINT,
    })
    sn_length!: number

    @Column({
        type: DataType.TINYINT,
    })
    allocable!: number

    @Column({
        type: DataType.TINYINT,
    })
    authoritative!: number

}
