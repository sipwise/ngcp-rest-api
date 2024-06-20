import {BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from 'typeorm'
import {VoipHeaderRuleCondition} from './voip-header-rule-condition.mariadb.entity'
  
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

        // @ManyToOne(() => VoipHeaderRuleCondition, condition => condition.values)
        //     condition!: VoipHeaderRuleCondition

            
    
        

}
