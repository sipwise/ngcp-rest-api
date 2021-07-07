import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ContractRegisterAttributes {
    id?: number;
    contract_id: number;
    actor?: string;
    type: string;
    data?: string;
}

@Table({
    tableName: 'contract_registers',
    timestamps: false,
})
export class ContractRegister extends Model<ContractRegisterAttributes, ContractRegisterAttributes> implements ContractRegisterAttributes {

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
        name: 'contractid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    contract_id!: number

    @Column({
        allowNull: true,
        type: DataType.STRING(15),
    })
    actor?: string

    @Column({
        type: DataType.STRING(31),
    })
    type!: string

    @Column({
        allowNull: true,
        type: DataType.STRING,
    })
    data?: string

}
