import {BaseEntity, Column, Entity, PrimaryGeneratedColumn} from 'typeorm'

@Entity({
    name: 'uploads',
    database: 'fileshare',
})
export class Upload extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: string

    @Column({
        type: 'longblob',
        nullable: true,
    })
    data: Buffer

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    original_name: string

    @Column({
        type: 'varchar',
        length: 255,
        nullable: true,
    })
    mime_type: string

    @Column({
        nullable: true,
    })
    size: number

    @Column({
        nullable: true,
    })
    ttl: number

    @Column({
        type: 'enum',
        enum: [
            'NEW',
            'UPLOADED',
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
    session_id: string

    @Column({
        type: 'datetime',
        nullable: true,
    })
    expires_at: Date

    @Column({
        nullable: true,
    })
    reseller_id?: number

    @Column({
        nullable: true,
    })
    subscriber_id?: number
}
