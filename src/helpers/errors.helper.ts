import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {EntityNotFoundError, QueryFailedError, TypeORMError} from 'typeorm'
import {Messages} from '../config/messages.config'

export function handleTypeORMError(err: Error) {
    if (err instanceof TypeORMError) {
        switch (err.constructor) {
            case EntityNotFoundError:
                return new NotFoundException()
            case QueryFailedError:
                let qErr = <QueryFailedError>err
                switch (qErr.driverError.code) {
                    case 'ER_DUP_ENTRY':
                        return new UnprocessableEntityException(Messages.invoke(Messages.DUPLICATE_ENTRY))
                }
        }
        // return new UnprocessableEntityException(err.message)
        return new UnprocessableEntityException()
    }
    return err
}

export function formatValidationErrors(errors: any[]) {
    if (errors === undefined) {
        return []
    }
    const data = new Map()
    errors.forEach(err => {
        for (let key in err.constraints) {
            let hash = {}
            hash[key] = err.constraints[key]
            if (data.has(err.property)) {
                data.get(err.property).push(hash)
            } else {
                data.set(err.property, [hash])
            }
        }
    })
    const message = []
    for (const [k, v] of data) {
        let hash = {}
        hash[k] = v
        message.push(hash)
    }
    return message
}
