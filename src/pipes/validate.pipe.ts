import {
    ArgumentMetadata,
    HttpStatus,
    Injectable,
    Optional,
    PipeTransform,
    Type,
    UnprocessableEntityException,
} from '@nestjs/common'
import {ClassTransformOptions} from '@nestjs/common/interfaces/external/class-transform-options.interface'
import {ValidatorOptions} from '@nestjs/common/interfaces/external/validator-options.interface'
import {ErrorHttpStatusCode} from '@nestjs/common/utils/http-error-by-code.util'
import {classToPlain, plainToClass} from 'class-transformer'
import {validate} from 'class-validator'
import {isUndefined} from 'util'
import {formatValidationErrors} from '../helpers/errors.helper'
import {obfuscatePasswordValidationErrors} from '../helpers/password-obfuscator.helper'
import {LoggerService} from '../logger/logger.service'
import {Dictionary} from '../helpers/dictionary.helper'

export interface ValidationPipeOptions extends ValidatorOptions {
    transform?: boolean;
    disableErrorMessages?: boolean;
    transformOptions?: ClassTransformOptions;
    errorHttpStatusCode?: ErrorHttpStatusCode;
    //exceptionFactory?: (errors: ValidationError[]) => any;
    validateCustomDecorators?: boolean;
    expectedType?: Type<any>;
}

export const isNil = (obj: any): obj is null | undefined =>
    isUndefined(obj) || obj === null

@Injectable()
export class ValidateInputPipe implements PipeTransform<any> {
    protected isTransformEnabled: boolean
    protected isDetailedOutputDisabled?: boolean
    protected validatorOptions: ValidatorOptions
    protected transformOptions: ClassTransformOptions
    protected errorHttpStatusCode: ErrorHttpStatusCode
    protected expectedType: Type<any>
    //protected exceptionFactory: (errors: ValidationError[]) => any
    protected validateCustomDecorators: boolean
    private readonly log = new LoggerService(ValidateInputPipe.name)

    constructor(@Optional() options?: ValidationPipeOptions) {
        options = options || {}
        const {
            transform,
            disableErrorMessages,
            errorHttpStatusCode,
            expectedType,
            transformOptions,
            validateCustomDecorators,
            ...validatorOptions
        } = options

        this.isTransformEnabled = !!transform
        this.validatorOptions = validatorOptions
        this.transformOptions = transformOptions
        this.isDetailedOutputDisabled = disableErrorMessages
        this.validateCustomDecorators = validateCustomDecorators || false
        this.errorHttpStatusCode = errorHttpStatusCode || HttpStatus.BAD_REQUEST
        this.expectedType = expectedType
    }

    public async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
        if (this.expectedType) {
            metadata = {...metadata, metatype: this.expectedType}
        }

        const metatype = metadata.metatype
        if (!metatype || !this.toValidate(metadata)) {
            return this.isTransformEnabled
                ? this.transformPrimitive(value, metadata)
                : value
        }
        const originalValue = value
        value = this.toEmptyIfNil(value)

        const isNil = value !== originalValue
        const isPrimitive = this.isPrimitive(value)
        let entity = plainToClass(
            metatype,
            value,
            this.transformOptions,
        )

        const originalEntity = entity

        /**
         *  Dictionary is an indexed class in which case the properties cannot be
         *  annotated with class-validator decorators. This causes the value to
         *  always be unknown and fail validation in validate(entity)
         *
         *  Dictionary validation is done in ParseIdDictionaryPipe and is skipped here
         */
        if (entity instanceof Dictionary)
            return entity

        const errors = await validate(entity, this.validatorOptions)
        if (errors.length > 0) {
            obfuscatePasswordValidationErrors(errors)
            this.log.debug({message: 'input validation failed', errors: errors})
            throw new UnprocessableEntityException(formatValidationErrors(errors))
        }
        if (isPrimitive) {
            // if the value is a primitive value and the validation process has been successfully completed
            // we have to revert the original value passed through the pipe
            entity = originalEntity
        }
        if (this.isTransformEnabled) {
            return entity
        }
        if (isNil) {
            // if the value was originally undefined or null, revert it back
            return originalValue
        }
        return Object.keys(this.validatorOptions).length > 0
            ? classToPlain(entity, this.transformOptions)
            : value
    }

    // TODO: Change {} to object?
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    protected toEmptyIfNil<T = any, R = any>(value: T): R | {} {
        return isNil(value) ? {} : value
    }

    protected isPrimitive(value: unknown): boolean {
        return ['number', 'boolean', 'string'].includes(typeof value)
    }

    protected toValidate(metadata: ArgumentMetadata): boolean {
        const {metatype, type} = metadata
        if (type === 'custom' && !this.validateCustomDecorators) {
            return false
        }
        const types = [String, Boolean, Number, Array, Object, Buffer]
        return !types.some(t => metatype === t) && !isNil(metatype)
    }

    protected transformPrimitive(value: any, metadata: ArgumentMetadata): any {
        if (!metadata.data) {
            // leave top-level query/param objects unmodified
            return value
        }
        const {type, metatype} = metadata
        if (type !== 'param' && type !== 'query') {
            return value
        }
        if (metatype === Boolean) {
            return value === true || value === 'true'
        }
        if (metatype === Number) {
            return +value
        }
        return value
    }

}
