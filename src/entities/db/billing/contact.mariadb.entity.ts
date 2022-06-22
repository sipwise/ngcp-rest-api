import {Reseller} from './reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from './contract.mariadb.entity'
import {ContactGender, ContactInternalEntity, ContactStatus} from '../../internal/contact.internal.entity'
import {internal} from '../../../entities'

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

    toInternal(): internal.Contact {
        const t: ContactInternalEntity = {
            bankname: this.bankname,
            bic: this.bic,
            city: this.city,
            company: this.company,
            comregnum: this.comregnum,
            country: this.country,
            create_timestamp: this.create_timestamp,
            email: this.email,
            faxnumber: this.faxnumber,
            firstname: this.firstname,
            gender: this.gender,
            gpp0: this.gpp0,
            gpp1: this.gpp1,
            gpp2: this.gpp2,
            gpp3: this.gpp3,
            gpp4: this.gpp4,
            gpp5: this.gpp5,
            gpp6: this.gpp6,
            gpp7: this.gpp7,
            gpp8: this.gpp8,
            gpp9: this.gpp9,
            iban: this.iban,
            id: this.id,
            lastname: this.lastname,
            mobilenumber: this.mobilenumber,
            modify_timestamp: this.modify_timestamp,
            newsletter: this.newsletter,
            phonenumber: this.phonenumber,
            postcode: this.postcode,
            reseller_id: this.reseller_id,
            status: this.status,
            street: this.street,
            terminate_timestamp: this.terminate_timestamp,
            timezone: this.timezone,
            vatnum: this.vatnum,
        }
        return internal.Contact.create(t)
    }

    fromInternal(contact: internal.Contact) {
        this.bankname = contact.bankname
        this.bic = contact.bic
        this.city = contact.city
        this.company = contact.company
        this.comregnum = contact.comregnum
        this.country = contact.country
        this.create_timestamp = contact.create_timestamp
        this.email = contact.email
        this.faxnumber = contact.faxnumber
        this.firstname = contact.firstname
        this.gender = contact.gender
        this.gpp0 = contact.gpp0
        this.gpp1 = contact.gpp1
        this.gpp2 = contact.gpp2
        this.gpp3 = contact.gpp3
        this.gpp4 = contact.gpp4
        this.gpp5 = contact.gpp5
        this.gpp6 = contact.gpp6
        this.gpp7 = contact.gpp7
        this.gpp8 = contact.gpp8
        this.gpp9 = contact.gpp9
        this.iban = contact.iban
        this.id = contact.id
        this.lastname = contact.lastname
        this.mobilenumber = contact.mobilenumber
        this.modify_timestamp = contact.modify_timestamp
        this.newsletter = contact.newsletter
        this.phonenumber = contact.phonenumber
        this.postcode = contact.postcode
        this.reseller_id = contact.reseller_id
        this.status = contact.status
        this.street = contact.street
        this.terminate_timestamp = contact.terminate_timestamp
        this.timezone = contact.timezone
        this.vatnum = contact.vatnum

        return this
    }
}
