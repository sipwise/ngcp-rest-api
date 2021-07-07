import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Customer} from './customer.entity'
import {Order} from './order.entity'
import {Reseller} from './reseller.entity'

interface ContactAttributes {
    id?: number;
    reseller_id?: number;
    gender?: string;
    firstname?: string;
    lastname?: string;
    comregnum?: string;
    company?: string;
    street?: string;
    postcode?: string;
    city?: string;
    country?: string;
    phonenumber?: string;
    mobilenumber?: string;
    email?: string;
    newsletter: number;
    modify_timestamp: Date;
    create_timestamp: Date;
    faxnumber?: string;
    iban?: string;
    bic?: string;
    vatnum?: string;
    bankname?: string;
    gpp0?: string;
    gpp1?: string;
    gpp2?: string;
    gpp3?: string;
    gpp4?: string;
    gpp5?: string;
    gpp6?: string;
    gpp7?: string;
    gpp8?: string;
    gpp9?: string;
    status: string;
    terminate_timestamp?: Date;
    timezone?: string;
}

@Table({
    tableName: 'contacts',
    timestamps: false,
})
export class Contact extends Model<ContactAttributes, ContactAttributes> implements ContactAttributes {

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
        name: 'ct_resellerid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id?: number

    @Column({
        allowNull: true,
        type: DataType.ENUM('male', 'female'),
    })
    gender?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    firstname?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    lastname?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    comregnum?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    company?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    street?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(16),
    })
    postcode?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    city?: string

    @Column({
        allowNull: true,
        type: DataType.CHAR(2),
    })
    country?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    phonenumber?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    mobilenumber?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    @Index({
        name: 'email_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    email?: string

    @Column({
        type: DataType.TINYINT,
    })
    newsletter!: number

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

    @Column({
        allowNull: true,
        type: DataType.STRING(31),
    })
    faxnumber?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(34),
    })
    iban?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(11),
    })
    bic?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(127),
    })
    vatnum?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    bankname?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp0?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp1?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp2?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp3?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp4?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp5?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp6?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp7?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp8?: string

    @Column({
        allowNull: true,
        type: DataType.STRING(255),
    })
    gpp9?: string

    @Column({
        type: DataType.ENUM('active', 'terminated'),
    })
    status!: string

    @Column({
        allowNull: true,
        type: DataType.DATE,
    })
    terminate_timestamp?: Date

    @Column({
        allowNull: true,
        type: DataType.STRING(80),
    })
    timezone?: string

    @HasMany(() => Contract, {
        sourceKey: 'id',
    })
    Contracts?: Contract[]

    @HasMany(() => Customer, {
        sourceKey: 'id',
    })
    Customers?: Customer[]

    // @HasMany(() => Customer, {
    //   sourceKey: 'id'
    // })
    // Customers?: Customer[];

    // @HasMany(() => Customer, {
    //   sourceKey: 'id'
    // })
    // Customers?: Customer[];

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
