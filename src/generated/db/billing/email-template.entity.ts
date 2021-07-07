import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface EmailTemplateAttributes {
    id?: number;
    reseller_id?: number;
    name: string;
    from_email: string;
    subject: string;
    body: string;
    attachment_name: string;
}

@Table({
    tableName: 'email_templates',
    timestamps: false,
})
export class EmailTemplate extends Model<EmailTemplateAttributes, EmailTemplateAttributes> implements EmailTemplateAttributes {

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
        allowNull: true,
        type: DataType.INTEGER,
    })
    @Index({
        name: 'reseller_name_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    reseller_id?: number

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
        type: DataType.STRING(255),
    })
    from_email!: string

    @Column({
        type: DataType.STRING(255),
    })
    subject!: string

    @Column({
        type: DataType.STRING,
    })
    body!: string

    @Column({
        type: DataType.STRING(255),
    })
    attachment_name!: string

}
