import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'domain_resellers',
    timestamps: false,
})
export class DomainReseller extends Model {

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
        field: 'domain_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'domainid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    domainId!: number

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
