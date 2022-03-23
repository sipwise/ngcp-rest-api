import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipSubscriber} from '../billing'

@Entity({
    name: 'voicemail_spool',
    database: 'kamailio',
})

export class VoicemailSpool extends BaseEntity {
    @PrimaryGeneratedColumn()
        id: number

    @Column({
        type: 'integer',
    })
        msgnum: number

    @Column({
        type: 'varchar',
    })
        dir: string


    @Column({
        type: 'varchar',
    })
        context: string


    @Column({
        type: 'varchar',
    })
        macrocontext: string


    @Column({
        type: 'varchar',
    })
        callerid: string

    @Column({
        type: 'varchar',
        length: 16,
    })
        origtime: string

    @Column({
        type: 'varchar',
    })
        duration: string

    @Column({
        type: 'varchar',
    })
        mailboxuser: string

    @Column({
        type: 'varchar',
    })
        mailboxcontext: string

    @Column({
        type: 'longblob',
    })
        recording: Buffer

    @Column({
        type: 'varchar',
    })
        flag: string

    @Column({
        type: 'varchar',
    })
        msg_id: string

    @Column({
        type: 'varchar',
    })
        call_id: string

    @ManyToOne(() => VoipSubscriber, subscriber => subscriber.id)
    @JoinColumn({name: 'mailboxuser', referencedColumnName: 'uuid'})
        provSubscriber: VoipSubscriber
}
