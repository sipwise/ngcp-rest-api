import {BaseEntity, Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from 'typeorm'
import {VoipHeaderRule} from './voip-header-rule.mariadb.entity'
import {HeaderRuleActionActionType, HeaderRuleActionHeaderPart, HeaderRuleActionValuePart} from '../../../entities/internal/header-rule-action.internal.entity' 
import {internal} from 'entities'

@Entity({
    name: 'voip_header_rule_actions',
    database: 'provisioning',
})
export class VoipHeaderRuleAction extends BaseEntity {
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
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        header!: string

    @Column({
        type: 'enum',
        enum: HeaderRuleActionHeaderPart,
        nullable: false,
        default: HeaderRuleActionHeaderPart.Full,
    })
        header_part!: HeaderRuleActionHeaderPart

    @Column({
        type: 'enum',
        enum: HeaderRuleActionActionType,
        nullable: false,
    })
        action_type!: HeaderRuleActionActionType

    @Column({
        type: 'enum',
        enum: HeaderRuleActionValuePart,
        nullable: false,
        default: HeaderRuleActionValuePart.Full,
    })
        value_part!: HeaderRuleActionValuePart

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
        value?: string

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
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
        default: 100,
    })
        priority!: number

    @Column({
        type: 'tinyint',
        width: 1,
        unsigned: true,
        nullable: false,
        default: false,
    })
        enabled!: boolean

    @ManyToOne(() => VoipHeaderRule, rule => rule.id)
    @JoinColumn({name: 'rule_id'})
        rule!: VoipHeaderRule

    toInternal(): internal.HeaderRuleAction {
        const entity = new internal.HeaderRuleAction()
        entity.id = this.id
        entity.ruleId = this.rule_id
        entity.header = this.header
        entity.headerPart = this.header_part
        entity.actionType = this.action_type
        entity.valuePart = this.value_part
        entity.value = this.value
        entity.rwrSetId = this.rwr_set_id
        entity.rwrDpId = this.rwr_dp_id
        entity.priority = this.priority
        return entity
    }

    fromInternal(entity: internal.HeaderRuleAction): VoipHeaderRuleAction {
        this.id = entity.id
        this.rule_id = entity.ruleId
        this.header = entity.header
        this.header_part = entity.headerPart
        this.action_type = entity.actionType
        this.value_part = entity.valuePart
        this.value = entity.value
        this.rwr_set_id = entity.rwrSetId
        this.rwr_dp_id = entity.rwrDpId
        this.priority = entity.priority
        this.enabled = entity.enabled
        return this
    }
    
}
