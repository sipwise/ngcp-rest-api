import {BaseEntity, Entity, PrimaryGeneratedColumn, Column} from "typeorm"

@Entity({
    name: 'domains',
    database: 'provisioning',
})
export class Domain extends BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number

    @Column({ length: 127 })
    domain!: string
}
