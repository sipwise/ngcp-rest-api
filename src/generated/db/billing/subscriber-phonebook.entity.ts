import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface SubscriberPhonebookAttributes {
    id?: number;
    subscriberId: number;
    name: string;
    number: string;
    shared: number;
}

@Table({
    tableName: 'subscriber_phonebook',
    timestamps: false,
})
export class SubscriberPhonebook extends Model<SubscriberPhonebookAttributes, SubscriberPhonebookAttributes> implements SubscriberPhonebookAttributes {

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
        field: 'subscriber_id',
        type: DataType.INTEGER,
    })
    @Index({
        name: 'rel_u_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    subscriberId!: number

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

    @Column({
        type: DataType.TINYINT,
    })
    shared!: number

}
