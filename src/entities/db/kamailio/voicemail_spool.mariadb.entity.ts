import {BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm'
import {VoipSubscriber as BillingVoipSubscriber} from '../billing'
import {VoipSubscriber as ProvisioningVoipSubscriber} from '../provisioning'
import {internal} from '../../../entities'

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

    @ManyToOne(() => BillingVoipSubscriber, bSub => bSub.id)
    @JoinColumn({name: 'mailboxuser', referencedColumnName: 'uuid'})
        billingSubscriber: BillingVoipSubscriber

    @ManyToOne(() => ProvisioningVoipSubscriber, pSub => pSub.id)
    @JoinColumn({name: 'mailboxuser', referencedColumnName: 'uuid'})
        provisioningSubscriber: ProvisioningVoipSubscriber

    toInternal(): internal.Voicemail {
        return internal.Voicemail.create({
            call_id: this.call_id,
            callerid: this.callerid,
            context: this.context,
            dir: this.dir,
            duration: this.duration,
            flag: this.flag,
            id: this.id,
            macrocontext: this.macrocontext,
            mailboxcontext: this.mailboxcontext,
            mailboxuser: this.mailboxuser,
            msg_id: this.msg_id,
            msgnum: this.msgnum,
            origtime: this.origtime,
            recording: this.recording,
            subscriber_id: this.billingSubscriber.id,
            username: this.provisioningSubscriber.username,
        })
    }

    fromInternal(data: internal.Voicemail): VoicemailSpool {
        this.call_id = data.call_id
        this.callerid = data.callerid
        this.context = data.context
        this.dir = data.dir
        this.duration = data.duration
        this.flag = data.flag
        this.id = data.id
        this.macrocontext = data.macrocontext
        this.mailboxcontext = data.mailboxcontext
        this.mailboxuser = data.mailboxuser
        this.msg_id = data.msg_id
        this.msgnum = data.msgnum
        this.origtime = data.origtime
        this.recording = data.recording
        return this
    }
}
