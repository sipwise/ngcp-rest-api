import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {VoipHeaderRule} from './voip-header-rule.mariadb.entity'

import {internal} from '~/entities'

@Entity({
    name: 'voip_header_rule_sets',
    database: 'provisioning',
})
export class VoipHeaderRuleSet extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
        default: 1,
    })
        reseller_id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        subscriber_id?: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        name!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        description?: string

    @OneToMany(() => VoipHeaderRule, rule => rule.set_id)
        rules!: VoipHeaderRule[]

    toInternal(): internal.HeaderRuleSet {
        const entity = new internal.HeaderRuleSet()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        entity.subscriberId = this.subscriber_id
        return entity
    }

    fromInternal(entity: internal.HeaderRuleSet): VoipHeaderRuleSet {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.subscriber_id = entity.subscriberId
        return this
    }
}
