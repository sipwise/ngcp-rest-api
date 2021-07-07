import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface InvoiceTemplateAttributes {
    id?: number;
    reseller_id: number;
    name: string;
    type: string;
    data?: Uint8Array;
}

@Table({
    tableName: 'invoice_templates',
    timestamps: false,
})
export class InvoiceTemplate extends Model<InvoiceTemplateAttributes, InvoiceTemplateAttributes> implements InvoiceTemplateAttributes {

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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'invoice_templates_ibfk_1',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    reseller_id!: number

    @Column({
        type: DataType.STRING(255),
    })
    name!: string

    @Column({
        type: DataType.ENUM('svg', 'html'),
    })
    type!: string

    @Column({
        allowNull: true,
        type: DataType.BLOB,
    })
    data?: Uint8Array

}
