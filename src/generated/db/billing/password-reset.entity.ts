import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

@Table({
    tableName: 'password_resets',
    timestamps: false,
})
export class PasswordReset extends Model {

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
        name: 'fk_pwd_reset_sub',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    subscriberId!: number

    @Column({
        type: DataType.CHAR(36),
    })
    @Index({
        name: 'uuid_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: false,
    })
    uuid!: string

    @Column({
        type: DataType.INTEGER,
    })
    timestamp!: number

}
