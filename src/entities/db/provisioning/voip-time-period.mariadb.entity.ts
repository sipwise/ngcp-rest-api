import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'

import {VoipTimeSet} from './voip-time-set.mariadb.entity'

import {internal} from '~/entities'
import {TimeSetEventFreq} from '~/entities/internal/time-set-event.internal.entity'

@Entity({
    name: 'voip_time_periods',
    database: 'provisioning',
})
export class VoipTimePeriod extends BaseEntity {

    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable: false,
    })
        time_set_id!: number

    @Column({
        type: 'timestamp',
        nullable: false,
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP',
    })
        start!: Date

    @Column({
        type: 'timestamp',
        nullable: false,
        default: '0000-00-00 00:00:00',
    })
        end!: Date

    @Column({
        type: 'enum',
        enum: TimeSetEventFreq,
        nullable: true,
    })
        freq?: TimeSetEventFreq

    @Column({
        type: 'timestamp',
        nullable: true,
    })
        until?: Date

    @Column({
        type: 'int',
        nullable: true,
    })
        count?: number

    @Column({
        type: 'int',
        nullable: true,
    })
        interval?: number

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        bysecond?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        byminute?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        byhour?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        byday?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        bymonthday?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        byyearday?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        byweekno?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        bymonth?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        bysetpos?: string

    @Column({
        type: 'text',
        nullable: true,
    })
        comment?: string

    @Column({
        type: 'varchar',
        length: 45,
        nullable: true,
    })
        duration?: string

    @Column({
        type: 'varchar',
        length: 2,
        nullable: true,
    })
        wkst?: string

    @ManyToOne(() => VoipTimeSet, set => set.id)
    @JoinColumn({name: 'time_set_id'})
        set!: VoipTimeSet

    toInternal(): internal.TimeSetEvent {
        const entity = new internal.TimeSetEvent()
        entity.id = this.id
        entity.timeSetId = this.time_set_id
        entity.start = this.start
        // the zero date is read as an invalid Date
        entity.end = isNaN(this.end?.getTime()) ? null : this.end
        entity.duration = this.duration
        entity.freq = this.freq
        entity.interval = this.interval
        entity.until = this.until
        entity.count = this.count
        entity.bysecond = this.bysecond
        entity.byminute = this.byminute
        entity.byhour = this.byhour
        entity.byday = this.byday
        entity.bymonthday = this.bymonthday
        entity.byyearday = this.byyearday
        entity.byweekno = this.byweekno
        entity.bymonth = this.bymonth
        entity.bysetpos = this.bysetpos
        entity.wkst = this.wkst
        entity.comment = this.comment
        return entity
    }

    fromInternal(entity: internal.TimeSetEvent): VoipTimePeriod {
        this.id = entity.id
        this.time_set_id = entity.timeSetId
        this.start = entity.start
        // no end is the zero date, which only the column default can store
        this.end = entity.end ?? undefined
        this.duration = entity.duration
        this.freq = entity.freq
        this.interval = entity.interval
        this.until = entity.until
        this.count = entity.count
        this.bysecond = entity.bysecond
        this.byminute = entity.byminute
        this.byhour = entity.byhour
        this.byday = entity.byday
        this.bymonthday = entity.bymonthday
        this.byyearday = entity.byyearday
        this.byweekno = entity.byweekno
        this.bymonth = entity.bymonth
        this.bysetpos = entity.bysetpos
        this.wkst = entity.wkst
        this.comment = entity.comment
        return this
    }
}
