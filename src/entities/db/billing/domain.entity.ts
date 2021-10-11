import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Reseller} from './reseller.entity'

@Entity({
    name: 'domains',
    database: 'billing',
})
export class Domain extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({length: 127})
    domain!: string

    @Column({
        type: 'int',
        width: 11,
    })
    reseller_id: number

    @ManyToOne(type => Reseller, reseller => reseller.domains)
    @JoinColumn({name: 'reseller_id'})
    reseller?: Reseller
}
