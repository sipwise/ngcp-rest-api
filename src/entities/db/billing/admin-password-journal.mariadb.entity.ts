import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'
import {internal} from '../..'

@Entity({
    name: 'admin_password_journal',
    database: 'billing',
})
export class AdminPasswordJournal extends BaseEntity {
    @PrimaryGeneratedColumn()
        id!: number

    @Column({
        type: 'int',
        unsigned: true,
        nullable:false,
    })
        admin_id: number

    @Column({
        type: 'varchar',
        length: 54,
        nullable: false,
    })
        value!: string

    fromInternal(data: internal.AdminPasswordJournal): AdminPasswordJournal {
        const pass = new AdminPasswordJournal()
        pass.id = data.id
        pass.admin_id = data.admin_id
        pass.value = data.value

        return pass
    }

    toInternal(): internal.AdminPasswordJournal {
        const pass = new internal.AdminPasswordJournal()
        pass.id = this.id
        pass.admin_id = this.admin_id
        pass.value = this.value

        return pass
    }
}
