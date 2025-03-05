import {BaseEntity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ViewColumn, ViewEntity} from 'typeorm'

import {Contract} from './contract.mariadb.entity'

import {internal} from '~/entities'

@ViewEntity({
    database: 'billing',
    name: 'v_contract_phonebook',
})
export class VContractPhonebook extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: string

    @ViewColumn({
        name: 'contract_id',
    })
        contract_id!: number

    @ViewColumn({
        name: 'name',
    })
        name!: string

    @ViewColumn({
        name: 'number',
    })
        number!: string

    @ManyToOne(() => Contract, contract => contract.phonebook)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

    toInternal(): internal.VCustomerPhonebook {
        const entity = new internal.VCustomerPhonebook()
        entity.id = this.id
        entity.contractId = this.contract_id
        entity.name = this.name
        entity.number = this.number
        return entity
    }
}
