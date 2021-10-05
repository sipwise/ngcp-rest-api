import {NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {EntityNotFoundError, TypeORMError} from 'typeorm'

export function handleTypeORMError(err: Error) {
    if (err instanceof TypeORMError) {
        switch (err.constructor) {
            case EntityNotFoundError:
                return new NotFoundException()

        }
        // return new UnprocessableEntityException(err.message)
        return new UnprocessableEntityException()
    }
    return err
}
