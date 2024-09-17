import {HeaderRuleDirection} from '../../../entities/internal/header-rule.internal.entity'
import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {VoipHeaderRuleSet} from './voip-header-rule-set.mariadb.entity'
import {VoipHeaderRuleAction} from './voip-header-rule-action.mariadb.entity'
import {VoipHeaderRuleCondition} from './voip-header-rule-condition.mariadb.entity'
import {internal} from '../../../entities'

@Entity({
    name: 'voip_header_rules',
    database: 'provisioning',
})
export class VoipHeaderRule extends BaseEntity {

        @PrimaryGeneratedColumn()
            id!: number

        @Column({
            type: 'int',
            width: 11,
            unsigned: true,
            nullable: false,
        })
            set_id!: number

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

        @Column({
            type: 'int',
            width: 11,
            unsigned: true,
            nullable: false,
            default: 100,
        })
            priority!: number

        @Column({
            type: 'enum',
            enum: HeaderRuleDirection,
            nullable: false,
            default: HeaderRuleDirection.AInbound,
        })
            direction!: HeaderRuleDirection

        @Column({
            type: 'boolean',
            nullable: false,
            default: false,
        })
            stopper!: boolean

        @Column({
            type: 'boolean',
            nullable: false,
            default: true,
        })
            enabled!: boolean

        @ManyToOne(() => VoipHeaderRuleSet, set => set.id)
        @JoinColumn({name: 'set_id'})
            set!: VoipHeaderRuleSet

        @OneToMany(() => VoipHeaderRuleAction, action => action.rule)
            actions!: VoipHeaderRuleAction[]

        @OneToMany(() => VoipHeaderRuleCondition, condition => condition.rule)
            conditions!: VoipHeaderRuleCondition[]

        toInternal(): internal.HeaderRule {
            const entity = new internal.HeaderRule()
            entity.id = this.id
            entity.setId = this.set_id
            entity.name = this.name
            entity.description = this.description
            entity.priority = this.priority
            entity.direction = this.direction
            entity.stopper = this.stopper
            entity.enabled = this.enabled
            return entity
        }

        fromInternal(entity: internal.HeaderRule): VoipHeaderRule {
            this.id = entity.id
            this.set_id = entity.setId
            this.name = entity.name
            this.description = entity.description
            this.priority = entity.priority
            this.direction = entity.direction
            this.stopper = entity.stopper
            this.enabled = entity.enabled
            return this
        }

}
