import {BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {VoipRewriteRule} from './voip-rewrite-rule.mariadb.entity'
import {internal} from 'entities'

@Entity({
    name: 'voip_rewrite_rule_sets',
    database: 'provisioning',
})
export class VoipRewriteRuleSet extends BaseEntity {

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
        type: 'varchar',
        length: 32,
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
        nullable: true,
        default: null,
    })
        caller_in_dpid?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        callee_in_dpid?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        caller_out_dpid?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        callee_out_dpid?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        caller_lnp_dpid?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
        default: null,
    })
        callee_lnp_dpid?: number

    @OneToMany(() => VoipRewriteRule, rule => rule.set_id)
        rules!: VoipRewriteRule[]

    toInternal(): internal.RewriteRuleSet {
        const entity = new internal.RewriteRuleSet()
        entity.id = this.id
        entity.resellerId = this.reseller_id
        entity.name = this.name
        entity.description = this.description
        entity.callerInDpid = this.caller_in_dpid
        entity.calleeInDpid = this.callee_in_dpid
        entity.callerOutDpid = this.caller_out_dpid
        entity.calleeOutDpid = this.callee_out_dpid
        entity.callerLnpDpid = this.caller_lnp_dpid
        entity.calleeLnpDpid = this.callee_lnp_dpid

        return entity
    }

    fromInternal(entity: internal.RewriteRuleSet): VoipRewriteRuleSet {
        this.id = entity.id
        this.reseller_id = entity.resellerId
        this.name = entity.name
        this.description = entity.description
        this.caller_in_dpid = entity.callerInDpid
        this.callee_in_dpid = entity.calleeInDpid
        this.caller_out_dpid = entity.callerOutDpid
        this.callee_out_dpid = entity.calleeOutDpid
        this.caller_lnp_dpid = entity.callerLnpDpid
        this.callee_lnp_dpid = entity.calleeLnpDpid

        return this
    }
}
