import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {Contract} from './contract.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'contract_phonebook',
    database: 'billing',
})
export class ContractPhonebook extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        contract_id!: number

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

    @ManyToOne(() => Contract, contract => contract.phonebook)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

    toInternal(): internal.CustomerPhonebook {
        const entity = new internal.CustomerPhonebook()
        entity.id = this.id
        entity.contractId = this.contract_id
        entity.name = this.name
        entity.number = this.number
        return entity
    }

    fromInternal(phonebook: internal.CustomerPhonebook): ContractPhonebook {
        this.id = phonebook.id as number
        this.contract_id = phonebook.contractId
        this.name = phonebook.name
        this.number = phonebook.number
        return this
    }
}
