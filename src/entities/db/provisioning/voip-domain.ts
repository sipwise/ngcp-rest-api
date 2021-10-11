import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_domains',
    database: 'provisioning',
})
export class VoipDomain extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({length: 127})
    domain!: string
}
