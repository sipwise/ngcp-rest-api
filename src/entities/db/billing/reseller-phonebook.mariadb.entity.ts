import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {Reseller} from './reseller.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'reseller_phonebook',
    database: 'billing',
})
export class ResellerPhonebook extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        reseller_id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        number!: string

    @ManyToOne(() => Reseller, reseller => reseller.phonebook)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    toInternal(): internal.ResellerPhonebook {
        const entity = new internal.ResellerPhonebook()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.number = this.number
        return entity
    }

    fromInternal(phonebook: internal.ResellerPhonebook): ResellerPhonebook {
        this.id = phonebook.id
        this.reseller_id = phonebook.resellerId
        this.name = phonebook.name
        this.number = phonebook.number
        return this
    }
}
