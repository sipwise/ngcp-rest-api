import {InternalServerErrorException, NotFoundException} from '@nestjs/common'
import {EntityNotFoundError, TypeORMError} from 'typeorm'

enum DbError {
    EntityNotFound = ''
}

export function handleTypeORMError(err: Error) {
    if (err instanceof TypeORMError) {
        switch (err.constructor) {
            case EntityNotFoundError:
                return new NotFoundException()

        }
        return new InternalServerErrorException(err.message)
        //return new InternalServerErrorException(err.errors.map(e => e.message))
    }
    return err
}
