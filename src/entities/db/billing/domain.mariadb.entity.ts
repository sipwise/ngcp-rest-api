import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {Reseller} from '~/entities/db/billing/reseller.mariadb.entity'
import {internal} from '~/entities'

@Entity({
    name: 'domains',
    database: 'billing',
})
export class Domain extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        domain!: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        reseller_id!: number

    @ManyToOne(() => Reseller, reseller => reseller.domains)
    @JoinColumn({name: 'reseller_id'})
        reseller!: Reseller

    fromInternal(domain: internal.Domain): Domain {
        this.id = domain.id
        this.domain = domain.domain
        this.reseller_id = domain.reseller_id
        return this
    }

    toInternal(): internal.Domain {
        const domain = new internal.Domain()
        domain.id = this.id
        domain.domain = this.domain
        domain.reseller_id = this.reseller_id
        return domain
    }
}
