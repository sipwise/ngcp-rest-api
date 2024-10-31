// TODO: Check if full type safety is possible in pipes
/* eslint-disable @typescript-eslint/no-explicit-any */ 
import {
    ArgumentMetadata,
    BadRequestException,
    HttpStatus,
    Injectable,
    Optional,
    PipeTransform,
    ValidationPipe,
    ValidationPipeOptions,
} from '@nestjs/common'
import {HttpErrorByCode} from '@nestjs/common/utils/http-error-by-code.util'

import {PatchDto} from '~/dto/patch.dto'
import {Operation, validate} from '~/helpers/patch.helper'

interface ParsePatchOptions extends Omit<
    ValidationPipeOptions,
    'transform' | 'validateCustomDecorators' | 'exceptionFactory'
> {
    exceptionFactory?: (error: any) => any
}

@Injectable()
export class ParsePatchPipe implements PipeTransform {
    protected exceptionFactory: (errors: string) => any
    protected options: ParsePatchOptions
    protected readonly validationPipe: ValidationPipe

    constructor(@Optional() options?: ParsePatchOptions) {
        const errorHttpStatusCode = HttpStatus.UNPROCESSABLE_ENTITY
        this.exceptionFactory =
            // TODO: Fix the return type
            // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
            (error => new HttpErrorByCode[errorHttpStatusCode](error))
        this.options = options || {exceptionFactory: this.exceptionFactory}
        this.validationPipe = new ValidationPipe({
            transform: true,
            validateCustomDecorators: true,
            ...options,
        })
    }

    async transform(value: any, _metadata: ArgumentMetadata): Promise<Operation[]> {
        value = Array.isArray(value) ? value : [value]
        let errors = []
        const patches: Operation[] = []
        for (const patch of value) {
            const err = validate(value)
            if (err) {
                errors = errors.concat(err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\''))
            }
            try {
                patches.push(await this.toClassInstance(patch))
            } catch (err) {
                errors = errors.concat(err)
            }
        }
        if (errors.length > 0) {
            throw this.exceptionFactory(errors as any)
        }
        return patches
    }

    private async toClassInstance(item: any, _index?: number): Promise<any> {
        const validationMetadata: ArgumentMetadata = {
            metatype: PatchDto, // TODO: check why PatchOperation cannot be used as type here
            type: 'body',
        }

        try {
            item = JSON.parse(item)
        } catch {
            //throw new BadRequestException(err)
        }

        const err = validate(item)
        if (err) {
            throw new BadRequestException(err.message.replace(/[\n\s]+/g, ' ').replace(/"/g, '\''))
        }
        return this.validationPipe.transform(item, validationMetadata)
    }
}
