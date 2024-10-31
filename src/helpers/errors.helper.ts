import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {QueryError} from 'mysql2'
import {EntityNotFoundError, QueryFailedError, TypeORMError} from 'typeorm'

import errors from '~/localisation/en/errors.json'

export function handleTypeORMError(err: Error): Error {
    if (err instanceof TypeORMError) {
        switch (err.constructor) {
        case EntityNotFoundError:
            return new NotFoundException()
        case QueryFailedError:
            // eslint-disable-next-line no-case-declarations
            const qErr = <QueryFailedError<QueryError>>err
            switch (qErr.driverError.code) {
            case 'ER_DUP_ENTRY':
                return new UnprocessableEntityException(errors.DUPLICATE_ENTRY)
            }
        }
        // return new UnprocessableEntityException(err.message)
        return new UnprocessableEntityException()
    }
    return err
}

// TODO: What is the correct type here?
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatValidationErrors(errors: any[]): any[] {
    if (errors === undefined) {
        return []
    }
    const data = new Map()
    errors.forEach(err => {
        for (const key in err.constraints) {
            const hash = {}
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
        const hash = {}
        hash[k] = v
        message.push(hash)
    }
    return message
}
