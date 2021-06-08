import {Column, DataType, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {NcosLnpList} from './ncos-lnp-list.entity'

@Table({
    tableName: 'lnp_providers',
    timestamps: false,
})
export class LnpProvider extends Model {

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
        allowNull: true,
        type: DataType.STRING(255),
    })
    name?: string

    @Column({
        type: DataType.STRING(32),
    })
    prefix!: string

    @Column({
        type: DataType.TINYINT,
    })
    authoritative!: number

    @Column({
        field: 'skip_rewrite',
        type: DataType.TINYINT,
    })
    skipRewrite!: number

    @HasMany(() => NcosLnpList, {
        sourceKey: 'id',
    })
    NcosLnpLists?: NcosLnpList[]

}
