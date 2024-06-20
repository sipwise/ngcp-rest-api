import {BaseEntity, Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from 'typeorm'
import {VoipHeaderRule} from './voip-header-rule.mariadb.entity'
import {HeaderRuleConditionExpression, HeaderRuleConditionMatchPart, HeaderRuleConditionMatchType, HeaderRuleConditionValueType} from 'entities/internal/header-rule-condition.internal.entity'
import {VoipHeaderRuleConditionValue} from './voip-header-rule-condition-value.mariadb.entity'

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
    

    // @OneToMany(() => VoipHeaderRuleConditionValue, value => value.condition)
    //     values!: VoipHeaderRuleConditionValue[]
}
