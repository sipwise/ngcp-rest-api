import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'

export enum ContactStatus {
    Active = 'active',
    Terminated = 'terminated'
}

export enum ContactGender {
    Male = 'male',
    Female = 'female'
}

@Entity({
    name: 'contacts',
    database: 'billing',
})
export class Contact extends BaseEntity {

    @PrimaryGeneratedColumn()
        id?: number

    @Column({
        nullable: true,
        type: 'int',
    })
        reseller_id?: number

    @Column({
        nullable: true,
        type: 'enum',
        enum: ContactGender,
    })
        gender?: ContactGender

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        firstname?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        lastname?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        comregnum?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        company?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        street?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 16,
    })
        postcode?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        city?: string

    @Column({
        nullable: true,
        type: 'char',
        length: 2,
    })
        country?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        phonenumber?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        mobilenumber?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        email?: string

    @Column({
        type: 'boolean',
    })
        newsletter!: boolean

    @Column({
        type: 'date',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
    })
        create_timestamp!: Date

    @Column({
        nullable: true,
        type: 'varchar',
        length: 31,
    })
        faxnumber?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 34,
    })
        iban?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 11,
    })
        bic?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 127,
    })
        vatnum?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        bankname?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp0?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp1?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp2?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp3?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp4?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp5?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp6?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp7?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp8?: string

    @Column({
        nullable: true,
        type: 'varchar',
        length: 255,
    })
        gpp9?: string

    @Column({
        type: 'enum',
        enum: ContactStatus,
        default: ContactStatus.Active,
    })
        status!: ContactStatus

    @Column({
        nullable: true,
        type: 'date',
    })
        terminate_timestamp?: Date

    @Column({
        nullable: true,
        type: 'varchar',
        length: 80,
    })
        timezone?: string

    @OneToMany(type => Contract, contract => contract.contact)
        contracts?: Contract[]

    //  @OneToMany(type => Customer, customer => customer.contact)
    //  customers?: Customer[]

    // @HasMany(() => Order, {
    //     sourceKey: 'id',
    // })
    // Orders?: Order[]

    @ManyToOne(type => Reseller, reseller => reseller.contacts)
    @JoinColumn({name: 'reseller_id'})
        reseller?: Reseller

}
