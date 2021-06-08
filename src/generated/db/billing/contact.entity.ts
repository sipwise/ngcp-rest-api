import {BelongsTo, Column, DataType, ForeignKey, HasMany, Index, Model, Table} from 'sequelize-typescript'
import {Contract} from './contract.entity'
import {Customer} from './customer.entity'
import {Order} from './order.entity'
import {Reseller} from './reseller.entity'

@Table({
    tableName: 'contacts',
    timestamps: false,
})
export class Contact extends Model {

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
        name: 'ct_resellerid_ref',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    resellerId?: number

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
        field: 'modify_timestamp',
        type: DataType.DATE,
    })
    modifyTimestamp!: Date

    @Column({
        field: 'create_timestamp',
        type: DataType.DATE,
    })
    createTimestamp!: Date

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
        field: 'terminate_timestamp',
        allowNull: true,
        type: DataType.DATE,
    })
    terminateTimestamp?: Date

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

    @HasMany(() => Order, {
        sourceKey: 'id',
    })
    Orders?: Order[]

    @BelongsTo(() => Reseller)
    Reseller?: Reseller

}
