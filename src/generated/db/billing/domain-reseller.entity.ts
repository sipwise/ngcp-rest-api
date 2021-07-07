import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface DomainResellerAttributes {
    id?: number;
    domain_id: number;
    reseller_id: number;
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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'domainid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    domain_id!: number

    @Column({
        type: DataType.INTEGER,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id!: number

}
