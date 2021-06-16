import {Column, DataType, HasMany, Index, Model, Table} from 'sequelize-typescript'

interface DomainAttributes {
    id?: number;
    domain: string;
}

@Table({
    tableName: 'domains',
    timestamps: false,
})
export class Domain extends Model<DomainAttributes, DomainAttributes> implements DomainAttributes {

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
        type: DataType.STRING(127),
    })
    @Index({
        name: 'domain_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    domain!: string

    // @HasMany(() => VoipSubscriber, {
    //     sourceKey: 'id',
    // })
    // VoipSubscribers?: VoipSubscriber[]

}
