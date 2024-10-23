import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '~/entities'

@Entity({
    name: 'voip_subscriber_webpassword_journal',
    database: 'provisioning',
})
export class VoipSubscriberWebPasswordJournal extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable:false,
    })
        subscriber_id: number

    @Column({
        type: 'varchar',
        length: 54,
        nullable: false,
    })
        value!: string

    fromInternal(data: internal.SubscriberWebPasswordJournal): VoipSubscriberWebPasswordJournal {
        const pass = new VoipSubscriberWebPasswordJournal()
        pass.id = data.id
        pass.subscriber_id = data.subscriber_id
        pass.value = data.value

        return pass
    }

    toInternal(): internal.SubscriberWebPasswordJournal {
        const pass = new internal.SubscriberWebPasswordJournal()
        pass.id = this.id
        pass.subscriber_id = this.subscriber_id
        pass.value = this.value

        return pass
    }
}
