import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'

import {VoipHeaderRuleConditionValue} from './voip-header-rule-condition-value.mariadb.entity'
import {VoipHeaderRule} from './voip-header-rule.mariadb.entity'
import {VoipRewriteRuleSet} from './voip-rewrite-rule-set.mariadb.entity'
import {VoipRewriteRule} from './voip-rewrite-rule.mariadb.entity'

import {internal} from '~/entities'
import {HeaderRuleConditionExpression, HeaderRuleConditionMatchPart, HeaderRuleConditionMatchType, HeaderRuleConditionValueType} from '~/entities/internal/header-rule-condition.internal.entity'
import {RwrDpEnum} from '~/enums/rwr-dp.enum'

@Entity({
    name: 'voip_header_rule_conditions',
    database: 'provisioning',
})
export class VoipHeaderRuleCondition extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        rule_id!: number

    @Column({
        type: 'enum',
        enum: HeaderRuleConditionMatchType,
        nullable: false,
        default: HeaderRuleConditionMatchType.Header,
    })
        match_type!: HeaderRuleConditionMatchType

    @Column({
        type: 'enum',
        enum: HeaderRuleConditionMatchPart,
        nullable: false,
        default: HeaderRuleConditionMatchPart.Full,
    })
        match_part!: HeaderRuleConditionMatchPart

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        match_name!: string

    @Column({
        type: 'enum',
        enum: HeaderRuleConditionExpression,
        nullable: false,
    })
        expression!: HeaderRuleConditionExpression

    @Column({
        type: 'boolean',
        nullable: false,
        default: false,
    })
        expression_negation!: boolean

    @Column({
        type: 'enum',
        enum: HeaderRuleConditionValueType,
        nullable: false,
    })
        value_type!: HeaderRuleConditionValueType

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        rwr_set_id?: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: true,
    })
        rwr_dp_id?: number

    @Column({
        type: 'boolean',
        nullable: false,
        default: true,
    })
        enabled!: boolean

    @ManyToOne(() => VoipHeaderRule, rule => rule.id)
    @JoinColumn({name: 'rule_id'})
        rule!: VoipHeaderRule

    @OneToMany(() => VoipHeaderRuleConditionValue, value => value.condition_id)
        values!: VoipHeaderRuleConditionValue[]

    @ManyToOne(() => VoipRewriteRuleSet, rwrSet => rwrSet.id)
    @JoinColumn({name: 'rwr_set_id'})
        rwr_set!: VoipRewriteRuleSet

    @ManyToOne(() => VoipRewriteRule, rwr => rwr.id)
    @JoinColumn({name: 'rwr_dp_id'})
        rwr!: VoipRewriteRule

    toInternal(): internal.HeaderRuleCondition {
        const entity = new internal.HeaderRuleCondition()
        entity.id = this.id
        entity.ruleId = this.rule_id
        entity.matchType = this.match_type
        entity.matchPart = this.match_part
        entity.matchName = this.match_name
        entity.expression = this.expression
        entity.expressionNegation = this.expression_negation
        entity.valueType = this.value_type
        entity.rwrSetId = this.rwr_set_id
        entity.rwrDpId = this.rwr_dp_id
        entity.enabled = this.enabled

        if (this.rwr_dp_id && this.rwr_set) {
            ['caller', 'callee'].forEach(field => {
                ['in', 'out', 'lnp'].forEach(direction => {
                    const dp = `${field}_${direction}`
                    const col_dp = `${field}_${direction}_dpid`
                    if (col_dp in this.rwr_set && this.rwr_set[col_dp] == this.rwr_dp_id) {
                        entity.rwrDp = RwrDpEnum[dp]
                    }
                })
            })
        } else {
            entity.rwrDp = null
        }
        return entity
    }

    fromInternal(entity: internal.HeaderRuleCondition): VoipHeaderRuleCondition {
        this.id = entity.id
        this.rule_id = entity.ruleId
        this.match_type = entity.matchType
        this.match_part = entity.matchPart
        this.match_name = entity.matchName
        this.expression = entity.expression
        this.expression_negation = entity.expressionNegation
        this.value_type = entity.valueType
        this.rwr_set_id = entity.rwrSetId
        this.rwr_dp_id = entity.rwrDpId
        this.enabled = entity.enabled

        return this
    }
}
