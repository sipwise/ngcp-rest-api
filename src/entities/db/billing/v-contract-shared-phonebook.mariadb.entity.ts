import {BaseEntity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, ViewColumn, ViewEntity} from 'typeorm'

import {Contract} from './contract.mariadb.entity'

import {internal} from '~/entities'

@ViewEntity({
    database: 'billing',
    name: 'v_contract_shared_phonebook',
})
export class VContractSharedPhonebook extends BaseEntity {
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

    @ViewColumn({
        name: 'own',
        transformer: {
            from: (value: number) => value === 1,
            to: (value: boolean) => value ? 1 : 0,
        },
    })
        own!: boolean

    @ManyToOne(() => Contract, contract => contract.phonebook)
    @JoinColumn({name: 'contract_id'})
        contract!: Contract

    toInternal(): internal.VCustomerPhonebook {
        const entity = new internal.VCustomerPhonebook()
        entity.id = this.id
        entity.contractId = this.contract_id
        entity.name = this.name
        entity.number = this.number
        entity.own = this.own
        return entity
    }
}