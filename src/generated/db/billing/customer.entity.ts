import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {Contract} from './contract.entity'
import {Order} from './order.entity'
import {Reseller} from './reseller.entity'

interface CustomerAttributes {
    id?: number;
    resellerId?: number;
    shopuser?: string;
    shoppass?: string;
    business: number;
    contactId?: number;
    techContactId?: number;
    commContactId?: number;
    externalId?: string;
    modifyTimestamp: Date;
    createTimestamp: Date;
}

@Table({
    tableName: 'customers',
    timestamps: false,
})
export class Customer extends Model<CustomerAttributes, CustomerAttributes> implements CustomerAttributes {

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

    @ForeignKey(() => Reseller)
    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reseller_id',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'resellerid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    @Index({
        name: 'reseller_id',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    shopuser?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    shoppass?: string

    @Column({
        type: DataType.TINYINT,
    })
    business!: number

    @ForeignKey(() => Contact)
    @Column({
        field: 'contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contactId?: number

    @ForeignKey(() => Contact)
    @Column({
        field: 'tech_contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'techcontact_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    techContactId?: number

    @ForeignKey(() => Contact)
    @Column({
        field: 'comm_contact_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'commcontactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    commContactId?: number

    @Column({
        field: 'external_id',
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    externalId?: string

    @Column({
        field: 'modify_timestamp',
        type: DataType.DATE,
    })
    modifyTimestamp!: Date

    @Column({
        field: 'create_timestamp',
        type: DataType.DATE,
    })
    createTimestamp!: Date

    @BelongsTo(() => Contact)
    Contact?: Contact

    // @BelongsTo(() => Contact)
    // Contact?: Contact
    //
    // @BelongsTo(() => Contact)
    // Contact?: Contact

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
