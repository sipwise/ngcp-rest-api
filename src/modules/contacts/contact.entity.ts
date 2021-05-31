import {ApiProperty} from '@nestjs/swagger'
import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'
import {Expose} from 'class-transformer'
import {GDPRCompliance, Sensitive} from '../../core/decorators/compliance.decorator'

enum ContactGender {
    Male = 'male',
    Female = 'female',
}

enum ContactStatus {
    Active = 'active',
    Terminated = 'terminated',
}

@Table({tableName: 'contacts', timestamps: false})
export class Contact extends Model<Contact> {
    @Column({primaryKey: true, autoIncrement: true, type: DataType.INTEGER})
    @Index({name: 'PRIMARY', using: 'BTREE', order: 'ASC', unique: true})
    @ApiProperty()
    id?: number

    @Column({allowNull: true, type: DataType.INTEGER})
    @Index({name: 'ct_resellerid_ref', using: 'BTREE', order: 'ASC', unique: false})
    @ApiProperty()
    reseller_id?: number

    @Column({allowNull: true, type: DataType.ENUM('male', 'female')})
    @ApiProperty({enum: ['male', 'female']})
    @GDPRCompliance()
    gender?: string // TODO: Change type to enum type: ContactGender

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    @GDPRCompliance()
    firstname?: string

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    @GDPRCompliance()
    lastname?: string

    @Column({allowNull: true, type: DataType.STRING(31)})
    @ApiProperty()
    comregnum?: string

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    company?: string

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    street?: string

    @Column({allowNull: true, type: DataType.STRING(16)})
    @ApiProperty()
    postcode?: string

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    city?: string

    @Column({allowNull: true, type: DataType.CHAR(2)})
    @ApiProperty()
    country?: string

    @Column({allowNull: true, type: DataType.STRING(31)})
    @ApiProperty()
    phonenumber?: string

    @Column({allowNull: true, type: DataType.STRING(31)})
    @ApiProperty()
    mobilenumber?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    @Expose()
    @Sensitive()
    email?: string

    @Column({type: DataType.TINYINT})
    @ApiProperty()
    newsletter!: number

    @Column({type: DataType.DATE})
    @ApiProperty()
    modify_timestamp!: Date

    @Column({type: DataType.DATE})
    @ApiProperty()
    create_timestamp!: Date

    @Column({allowNull: true, type: DataType.STRING(31)})
    @ApiProperty()
    faxnumber?: string

    @Column({allowNull: true, type: DataType.STRING(34)})
    @ApiProperty()
    iban?: string

    @Column({allowNull: true, type: DataType.STRING(11)})
    @ApiProperty()
    bic?: string

    @Column({allowNull: true, type: DataType.STRING(127)})
    @ApiProperty()
    vatnum?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    bankname?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp0?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp1?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp2?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp3?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp4?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp5?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp6?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp7?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp8?: string

    @Column({allowNull: true, type: DataType.STRING(255)})
    @ApiProperty()
    gpp9?: string

    @Column({type: DataType.ENUM('active', 'terminated')})
    @ApiProperty({enum: ['active', 'terminated']})
    status!: string // Todo: change type to enum type: ContactStatus

    @Column({allowNull: true, type: DataType.DATE})
    @ApiProperty()
    terminate_timestamp?: Date

    @Column({allowNull: true, type: DataType.STRING(80)})
    @ApiProperty()
    timezone?: string
}

