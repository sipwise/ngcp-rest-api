module.exports = function(app, dbName, tableName, dbObj, DataTypes) {
    const tableDef = dbObj.define(tableName, {
        id: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        reseller_id: {
            type: DataTypes.INTEGER(11).UNSIGNED,
            allowNull: true,
        },
        login: {
            type: DataTypes.STRING(31),
            allowNull: false,
        },
        md5pass: {
            type: DataTypes.STRING(32),
            allowNull: true,
        },
        saltedpass: {
            type: DataTypes.STRING(54),
            allowNull: true,
        },
        is_master: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        is_superuser: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        is_ccare: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 1,
        },
        read_only: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        show_passwords: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 1,
        },
        call_data: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        billing_data: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 1,
        },
        lawful_intercept: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
        ssl_client_m_serial: {
            type: DataTypes.BIGINT(2).UNSIGNED,
            allowNull: true,
        },
        ssl_client_m_serial: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        can_reset_password: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 1,
        },
        can_reset_password: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
        },
    });
    app.db[dbName] = {};
    app.db[dbName][tableName] = tableDef;
}
