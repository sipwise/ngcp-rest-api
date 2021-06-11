import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ResellerPhonebookAttributes {
    id?: number;
    resellerId: number;
    name: string;
    number: string;
}

@Table({
    tableName: 'reseller_phonebook',
    timestamps: false,
})
export class ResellerPhonebook extends Model<ResellerPhonebookAttributes, ResellerPhonebookAttributes> implements ResellerPhonebookAttributes {

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
        type: DataType.INTEGER,
    })
    @Index({
        name: 'rel_u_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    resellerId!: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'name_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    name!: string

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'rel_u_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    @Index({
        name: 'number_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    number!: string

}
