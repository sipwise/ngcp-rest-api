import {Column, DataType, Index, Model, Table} from 'sequelize-typescript'

interface ProvisioningTemplateAttributes {
    id?: number;
    reseller_id?: number;
    name: string;
    description: string;
    lang: string;
    yaml: string;
    modify_timestamp: Date;
    create_timestamp: Date;
}

@Table({
    tableName: 'provisioning_templates',
    timestamps: false,
})
export class ProvisioningTemplate extends Model<ProvisioningTemplateAttributes, ProvisioningTemplateAttributes> implements ProvisioningTemplateAttributes {

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
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    reseller_id?: number

    @Column({
        type: DataType.STRING(255),
    })
    @Index({
        name: 'resnam_idx',
        using: 'BTREE',
        order: 'ASC',
        unique: true,
    })
    name!: string

    @Column({
        type: DataType.STRING(255),
    })
    description!: string

    @Column({
        type: DataType.ENUM('perl', 'js'),
    })
    lang!: string

    @Column({
        type: DataType.STRING,
    })
    yaml!: string

    @Column({
        type: DataType.DATE,
    })
    modify_timestamp!: Date

    @Column({
        type: DataType.DATE,
    })
    create_timestamp!: Date

}
