import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'voip_number_block_resellers',
    timestamps: false,
})
export class VoipNumberBlockReseller extends Model {

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
        field: 'number_block_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'numblockid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    numberBlockId!: number

    @Column({
        field: 'reseller_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId!: number

}
