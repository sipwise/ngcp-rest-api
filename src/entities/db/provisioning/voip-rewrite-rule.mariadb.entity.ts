import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipRewriteRuleSet} from './voip-rewrite-rule-set.mariadb.entity'

import {internal} from '~/entities'
import {RewriteRuleDirection, RewriteRuleField} from '~/entities/internal/rewrite-rule.internal.entity'

@Entity({
    name: 'voip_rewrite_rules',
    database: 'provisioning',
})
export class VoipRewriteRule extends BaseEntity {

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
        length: 128,
        nullable: false,
        default: '',
    })
        match_pattern!: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
        default: '',
    })
        replace_pattern!: string

    @Column({
        type: 'varchar',
        length: 127,
        nullable: false,
        default: '',
    })
        description!: string

    @Column({
        type: 'enum',
        enum: ['in', 'out', 'lnp'],
        nullable: false,
        default: 'in',
    })
        direction!: string

    @Column({
        type: 'enum',
        enum: ['caller', 'callee'],
        nullable: false,
        default: 'caller',
    })
        field!: string

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
        default: 50,
    })
        priority!: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        enabled!: boolean

    @ManyToOne(() => VoipRewriteRuleSet, set => set.id)
    @JoinColumn({name: 'set_id'})
        set!: VoipRewriteRuleSet


    toInternal(): internal.RewriteRule {
        const entity = new internal.RewriteRule()
        entity.id = this.id
        entity.setId = this.set_id
        entity.description = this.description
        entity.matchPattern = this.match_pattern
        entity.replacePattern = this.replace_pattern
        entity.direction = this.direction as RewriteRuleDirection
        entity.field = this.field as RewriteRuleField
        entity.priority = this.priority
        entity.enabled = this.enabled
        return entity
    }

    fromInternal(entity: internal.RewriteRule): VoipRewriteRule {
        this.id = entity.id
        this.set_id = entity.setId
        this.description = entity.description
        this.match_pattern = entity.matchPattern
        this.replace_pattern = entity.replacePattern
        this.direction = entity.direction
        this.field = entity.field
        this.priority = entity.priority
        this.enabled = entity.enabled
        return this
    }
}
