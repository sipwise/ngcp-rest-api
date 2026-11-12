import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'voip_allowed_ip_groups',
    database: 'provisioning',
})
export class VoipAllowedIpGroup extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        group_id!: number

    @Column({
        type: 'varchar',
        length: 46,
        nullable: false,
    })
        ipnet!: string
}
