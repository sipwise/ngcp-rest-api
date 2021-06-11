import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface DomainResellerAttributes {
    id?: number;
    domainId: number;
    resellerId: number;
}

@Table({
    tableName: 'domain_resellers',
    timestamps: false,
})
export class DomainReseller extends Model<DomainResellerAttributes, DomainResellerAttributes> implements DomainResellerAttributes {

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
