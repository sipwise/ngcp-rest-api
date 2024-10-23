import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipHeaderRuleCondition} from '~/entities/db/provisioning/voip-header-rule-condition.mariadb.entity'
import {internal} from '~/entities'

@Entity({
    name: 'voip_header_rule_condition_values',
    database: 'provisioning',
})
export class VoipHeaderRuleConditionValue extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        width: 11,
        unsigned: true,
        nullable: false,
    })
        condition_id!: number

    @Column({
        type: 'varchar',
        length: 255,
        nullable: false,
    })
        value!: string

    @ManyToOne(() => VoipHeaderRuleCondition, condition => condition.id)
    @JoinColumn({name: 'condition_id'})
        condition!: VoipHeaderRuleCondition

    constructor(condition_id?: number, value?: string) {
        super()
        this.condition_id = condition_id
        this.value = value
    }

    toInternal(): internal.HeaderRuleConditionValue {
        const entity = new internal.HeaderRuleConditionValue()
        entity.id = this.id
        entity.conditionId = this.condition_id
        entity.value = this.value
        return entity
    }
}
