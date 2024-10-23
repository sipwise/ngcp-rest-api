import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '~/entities'

@Entity({
    name: 'voip_domains',
    database: 'provisioning',
})
export class VoipDomain extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
    })
        domain!: string

    fromInternal(domain: internal.Domain): VoipDomain {
        this.id = domain.id
        this.domain = domain.domain
        return this
    }
}
