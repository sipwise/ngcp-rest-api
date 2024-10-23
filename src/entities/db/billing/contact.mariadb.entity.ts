import {Reseller} from '~/entities/db/billing/reseller.mariadb.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {Contract} from '~/entities/db/billing/contract.mariadb.entity'
import {ContactGender, ContactInternalEntity, ContactStatus} from '~/entities/internal/contact.internal.entity'
import {internal} from '~/entities'

@Entity({
    name: 'contacts',
    database: 'billing',
})
export class Contact extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: true,
    })
        reseller_id?: number

    @Column({
        type: 'enum',
        enum: ContactGender,
        nullable: true,
    })
        gender?: ContactGender

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        firstname?: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        lastname?: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: true,
    })
        comregnum?: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        company?: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        street?: string

    @Column({
        type: 'varchar',
        length: 16,
        nullable: true,
    })
        postcode?: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        city?: string

    @Column({
        type: 'char',
        length: 2,
        nullable: true,
    })
        country?: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: true,
    })
        phonenumber?: string

    @Column({
        type: 'varchar',
        length: 31,
        nullable: true,
    })
        mobilenumber?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        email?: string

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        newsletter!: boolean

    @Column({
        type: 'date',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        modify_timestamp!: Date

    @Column({
        type: 'date',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        create_timestamp!: Date

    @Column({
        type: 'varchar',
        length: 31,
        nullable: true,
    })
        faxnumber?: string

    @Column({
        type: 'varchar',
        length: 34,
        nullable: true,
    })
        iban?: string

    @Column({
        type: 'varchar',
        length: 11,
        nullable: true,
    })
        bic?: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: true,
    })
        vatnum?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        bankname?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp0?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp1?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp2?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp3?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp4?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp5?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp6?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp7?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp8?: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        gpp9?: string

    @Column({
        type: 'enum',
        enum: ContactStatus,
        nullable: false,
        default: ContactStatus.Active,
    })
        status!: ContactStatus

    @Column({
        type: 'date',
        nullable: true,
    })
        terminate_timestamp?: Date

    @Column({
        nullable: true,
        type: 'varchar',
        length: 80,
    })
        timezone?: string

    @OneToMany(() => Contract, contract => contract.contact)
        contracts!: Contract[]

    //  @OneToMany(() => Customer, customer => customer.contact)
    //  customers?: Customer[]

    // @HasMany(() => Order, {
    //     sourceKey: 'id',
    // })
    // Orders?: Order[]

    @ManyToOne(() => Reseller, reseller => reseller.contacts)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

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

    fromInternal(contact: internal.Contact): this {
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
