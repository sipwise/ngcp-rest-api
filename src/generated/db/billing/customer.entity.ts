import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contact} from './contact.entity'
import {Contract} from './contract.entity'
import {Order} from './order.entity'
import {Reseller} from './reseller.entity'

interface CustomerAttributes {
    id?: number;
    reseller_id?: number;
    shopuser?: string;
    shoppass?: string;
    business: number;
    contact_id?: number;
    tech_contact_id?: number;
    comm_contact_id?: number;
    external_id?: string;
    modify_timestamp: Date;
    create_timestamp: Date;
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
    reseller_id?: number

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'contactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contact_id?: number

    @ForeignKey(() => Contact)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'techcontact_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    tech_contact_id?: number

    @ForeignKey(() => Contact)
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'commcontactid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    comm_contact_id?: number

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'externalid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    external_id?: string

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    // @BelongsTo(() => Contact)
    // Contact?: Contact;

    // @BelongsTo(() => Contact)
    // Contact?: Contact;

    // @BelongsTo(() => Contact)
    // Contact?: Contact;

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
