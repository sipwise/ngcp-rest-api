import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipRewriteRuleSet} from '~/entities/db/provisioning/voip-rewrite-rule-set.mariadb.entity'

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

}
