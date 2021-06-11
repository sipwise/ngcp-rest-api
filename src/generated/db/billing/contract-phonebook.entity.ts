import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ContractPhonebookAttributes {
    id?: number;
    contractId: number;
    name: string;
    number: string;
}

@Table({
    tableName: 'contract_phonebook',
    timestamps: false,
})
export class ContractPhonebook extends Model<ContractPhonebookAttributes, ContractPhonebookAttributes> implements ContractPhonebookAttributes {

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
        field: 'contract_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'rel_u_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    contractId!: number

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
