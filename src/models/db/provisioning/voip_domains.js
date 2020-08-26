module.exports = function(app, dbName, tableName, dbObj, DataTypes) {
    const tableDef = dbObj.define(tableName, {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
        },
        domain: {
            type: DataTypes.STRING(127)
        }
    });
    app.db[dbName] = {};
    app.db[dbName][tableName] = tableDef;
}
