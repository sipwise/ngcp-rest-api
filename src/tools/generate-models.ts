import {Connection, createConnection} from 'mysql2/promise'
import {createWriteStream, promises as fsp, readFileSync, writeFileSync} from 'fs'
import {DialectMySQL, IConfig, ModelBuilder} from 'sequelize-typescript-generator'
import {camelCase, hyphenate, pascalCase} from './string-utils'
import {config} from '../config/main.config'


const dbs = ['billing']
const modelsPath = '../../src/generated/db'
const assocPath = '.'

/**
 * SQL statement that fetches all references to a given DB and Table
 */
const referenceStatement = `SELECT TABLE_NAME,
                                   COLUMN_NAME,
                                   CONSTRAINT_NAME,
                                   REFERENCED_TABLE_NAME,
                                   REFERENCED_COLUMN_NAME
                            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                            WHERE REFERENCED_TABLE_SCHEMA = ?
                              AND REFERENCED_TABLE_NAME = ?`

async function main() {
    for (let db of dbs) {
        await writeRelationsForDB(db, assocPath)
        await writeModelsForDB(db, assocPath, modelsPath)

        // renaming files
        try {
            // store path of current directory
            const dirPath = `${modelsPath}/${db}`
            const files = await fsp.readdir(dirPath)
            for (const oldName of files) {
                let [newName, suffix] = oldName.split('.')
                newName = hyphenate(newName)
                newName = `${newName}.entity.${suffix}`
                console.log('Renaming', oldName, '-->', newName)
                await fsp.rename(`${dirPath}/${oldName}`, `${dirPath}/${newName}`)

            }

            /**
             * Rewriting imports for newly created files
             */
            const renamedFiles = await fsp.readdir(dirPath)
            for (const f of renamedFiles) {
                // store path of current file
                const fPath = `${dirPath}/${f}`
                let content = readFileSync(fPath, 'ascii')
                const re = /(^.+?)\sfrom\s'\.\/(.+)';$/gm
                content = content.replace(re, function (match, g1, g2, g3) {
                    g2 = hyphenate(g2) + '.entity'
                    return `${g1} from './${g2}'`
                })
                console.log('Rewriting imports in', fPath)
                writeFileSync(fPath, content)
            }
        } catch (e) {
            console.error(e)
        }
    }
}

/**
 * Generates files for models of a given database
 *
 * `builderConfig.metadata.case` determines how classes and fields are named.
 *
 * @param db Name of the database
 * @param assocPath Directory path to association file
 * @param modelsPath Directory path for models output
 */
async function writeModelsForDB(db: string, assocPath: string, modelsPath: string) {
    const builderConfig: IConfig = {
        connection: {
            dialect: 'mysql',
            host: config.database.host,
            username: config.database.user,
            password: config.database.pass,
            database: db,
        },
        metadata: {
            indices: true,
            associationsFile: `${assocPath}/${db}-associations.csv`,
            case: (value, target) => {
                if (target === 'model') {
                    value = pascalCase(value)
                    let groups = value.match(/(^.+?)(s*)$/)
                    return groups[1]
                }
                return camelCase(value)
            },
        },
        output: {
            clean: true,
            outDir: `${modelsPath}/${db}/`,
        },
    }

    const dialect = new DialectMySQL()
    const builder = new ModelBuilder(builderConfig, dialect)

    try {
        await builder.build()
    } catch (err) {
        console.error(err)
        return
    }
}

/**
 * Writes file containing all relations for a given database.
 *
 * @param db Database name
 * @param path Output directory of relations file
 */
async function writeRelationsForDB(db: string, path: string) {
    const fileName = `${path}/${db}-associations.csv`
    const connection = await createConnection(
        {
            host: config.database.host,
            user: config.database.user,
            password: config.database.pass,
            database: db,
        },
    )
    const [tables] = await connection.execute(
        'SHOW TABLES',
    )
    let relations = []
    for (let t in tables) {
        relations = relations.concat(await getRelationsForTable(db, tables[t][`Tables_in_${db}`], connection))
    }
    const file = createWriteStream(fileName)
    file.on('error', function (err) {
        console.log('error writing associations file for db:', db, ':', err)
        return
    })
    relations.forEach(function (relation) {
        file.write(relation + '\n')
    })

    file.end()
    connection.end()
}

/**
 * Get all relations of a certain table
 * @param db Database name
 * @param table Table name
 * @param connection SQL connection object
 */
async function getRelationsForTable(db: string, table: string, connection: Connection) {
    const tableRefs = []
    const [rows, fields] = await connection.execute(
        referenceStatement,
        [db, table],
    )
    for (let row in rows) {
        tableRefs.push({
            leftTable: rows[row]['REFERENCED_TABLE_NAME'],
            leftColumn: rows[row]['REFERENCED_COLUMN_NAME'],
            rightTable: rows[row]['TABLE_NAME'],
            rightColumn: rows[row]['COLUMN_NAME'],
        })
    }
    const results = []
    for (let tr of tableRefs) {
        const [rows, fields] = await connection.execute(
            referenceStatement,
            [db, tr.rightTable],
        )
        let added = false
        for (let res in rows) {
            if (rows[res]['TABLE_NAME'] === table) {
                results.push(`1:1, ${tr.leftColumn}, ${rows[res]['REFERENCED_COLUMN_NAME']}, ${tr.leftTable}, ${rows[res]['REFERENCED_TABLE_NAME']}`)
            } else if (added) {
                break
            } else {
                results.push(`1:N, ${tr.leftColumn}, ${tr.rightColumn}, ${tr.leftTable}, ${tr.rightTable}`)
                added = true
            }
        }
    }
    return results
}

main()

