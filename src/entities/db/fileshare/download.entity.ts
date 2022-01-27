import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'downloads',
    database: 'fileshare',
})
export class Download extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({
        type: 'enum',
        enum: [
            'NEW',
            'DOWNLOADED',
        ],
    })
    state: string

    @Column({
        type: 'datetime',
    })
    created_at: Date

    @Column({
        type: 'datetime',
    })
    updated_at: Date

    @Column({
        type: 'char',
        length: 36,
        nullable: true,
    })
    upload_id: string

    @Column({
        type: 'datetime',
        nullable: true,
    })
    expires_at: Date
}
