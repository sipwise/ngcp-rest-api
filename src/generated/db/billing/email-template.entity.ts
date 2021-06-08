import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'email_templates',
    timestamps: false,
})
export class EmailTemplate extends Model {

    @Column({
        primaryKey: true,
        autoIncrement: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'PRIMARY',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    id?: number

    @Column({
        field: 'reseller_id',
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reseller_name_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'reseller_name_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        field: 'from_email',
        type: DataType.STRING(255),
    })
    fromEmail!: string

    @Column({
        type: DataType.STRING(255),
    })
    subject!: string

    @Column({
        type: DataType.STRING,
    })
    body!: string

    @Column({
        field: 'attachment_name',
        type: DataType.STRING(255),
    })
    attachmentName!: string

}
