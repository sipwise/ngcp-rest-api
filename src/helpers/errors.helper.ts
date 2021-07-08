import {ValidationError} from 'sequelize'

export function handleSequelizeError(err: Error) {
    if (err instanceof ValidationError) {
        return err.errors.map(e => e.message)
    }
    return err
}
