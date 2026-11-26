import {ArgumentMetadata, Type, ValidationPipe, ValidationPipeOptions} from '@nestjs/common'
import type {TransformerPackage} from '@nestjs/common/interfaces/external/transformer-package.interface'
import {ClassTransformOptions, instanceToPlain, plainToInstance} from 'class-transformer'
import {
    IS_ARRAY,
    ValidationError,
    ValidationTypes,
    ValidatorOptions,
    getMetadataStorage,
    validate as classValidatorValidate,
} from 'class-validator'
import type {ValidationMetadata} from 'class-validator/types/metadata/ValidationMetadata'

import {ErrorEntry, formatValidationErrors} from '~/helpers/errors.helper'
import {forEachYield, mapYield} from '~/helpers/yield.helper'

export function validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> {
    return validateInChunks(object, {
        forbidUnknownValues: false,
        ...validatorOptions,
    })
}

const VALIDATION_CHUNK_SIZE = 500

// constraints that give the same result for a chunk of an array as for the whole array
const chunkableTypes: string[] = [
    ValidationTypes.CONDITIONAL_VALIDATION,
    ValidationTypes.IS_DEFINED,
    ValidationTypes.NESTED_VALIDATION,
    ValidationTypes.WHITELIST,
]

function isChunkable(metadata: ValidationMetadata): boolean {
    return metadata.each || metadata.name == IS_ARRAY || chunkableTypes.includes(metadata.type)
}

function propertyMetadatas(target: Type<unknown>, options: ValidatorOptions): Record<string, ValidationMetadata[]> {
    const storage = getMetadataStorage()
    return storage.groupByPropertyName(storage.getTargetValidationMetadatas(
        target, undefined, options.always, options.strictGroups, options.groups,
    ))
}

// arrays larger than a chunk whose constraints only check their elements (nested dtos, `each`, `isArray`)
function largeArrays(object: object, metadatas: Record<string, ValidationMetadata[]>): string[] {
    return Object.keys(metadatas).filter(property => {
        const value = object[property]
        return Array.isArray(value) && value.length > VALIDATION_CHUNK_SIZE && metadatas[property].every(isChunkable)
    })
}

function chunkStarts(length: number): number[] {
    const starts: number[] = []
    for (let start = 0; start < length; start += VALIDATION_CHUNK_SIZE)
        starts.push(start)
    return starts
}

/**
 * class-validator's validate(), with the same errors. Large arrays (see largeArrays) are validated chunk by
 * chunk with yields, so that large bodies (e.g. 100k alias numbers) don't block the event loop.
 */
export async function validateInChunks(object: object, options: ValidatorOptions): Promise<ValidationError[]> {
    const metadatas = propertyMetadatas(object.constructor as Type<unknown>, options)
    const properties = Object.keys(metadatas)
    const large = largeArrays(object, metadatas)
    if (!large.length)
        return classValidatorValidate(object, options)

    const arrays: Record<string, unknown[]> = Object.fromEntries(large.map(property => [property, object[property]]))
    const emptied = Object.fromEntries(large.map(property => [property, []]))
    Object.assign(object, emptied)
    let errors: ValidationError[]
    try {
        errors = await classValidatorValidate(object, options)
    } finally {
        Object.assign(object, arrays)
    }

    for (const property of large) {
        const error = await validateArrayInChunks(object, property, arrays[property], emptied, options)
        if (!error)
            continue
        // constraints merged from several chunks, in the order of the decorators
        const names = metadatas[property].map(metadata => metadata.name)
        if (error.constraints)
            error.constraints = Object.fromEntries(Object.entries(error.constraints).sort(([a], [b]) => names.indexOf(a) - names.indexOf(b)))
        errors.push(error)
    }
    // the order of class-validator: not whitelisted properties first, then the validated ones
    return errors.sort((a, b) => properties.indexOf(a.property) - properties.indexOf(b.property))
}

/**
 * Errors of one array property, validated in chunks on copies of the object; the item indexes are those of
 * the whole array
 */
async function validateArrayInChunks(object: object, property: string, items: unknown[], emptied: object, options: ValidatorOptions): Promise<ValidationError | undefined> {
    let merged: ValidationError
    await forEachYield(chunkStarts(items.length), async start => {
        const chunk = items.slice(start, start + VALIDATION_CHUNK_SIZE)
        const copy = Object.assign(Object.create(Object.getPrototypeOf(object)), object, emptied, {[property]: chunk})
        const error = (await classValidatorValidate(copy, options)).find(err => err.property == property)
        if (!error)
            return
        for (const child of error.children)
            child.property = `${start + +child.property}`
        if (!merged) {
            merged = error
            return
        }
        if (error.constraints)
            merged.constraints = {...merged.constraints, ...error.constraints}
        merged.children.push(...error.children)
    })
    return merged
}

/**
 * class-transformer's plainToInstance() of a request body. The arrays validateInChunks splits are transformed
 * in chunks with yields, each chunk as part of a copy of the body; a @Transform on such an array would see
 * one chunk (request dtos have none).
 */
export async function plainToInstanceInChunks<T extends object>(cls: Type<T>, plain: unknown, options?: ClassTransformOptions): Promise<T> {
    if (plain == null || typeof plain != 'object' || Array.isArray(plain))
        return plainToInstance(cls, plain, options)
    const large = largeArrays(plain, propertyMetadatas(cls, {}))
    if (!large.length)
        return plainToInstance(cls, plain, options)

    const base = {...plain, ...Object.fromEntries(large.map(property => [property, []]))}
    const instance = plainToInstance(cls, base, options)
    for (const property of large) {
        const items: unknown[] = plain[property]
        const chunks = await mapYield(chunkStarts(items.length), start => {
            const chunk = items.slice(start, start + VALIDATION_CHUNK_SIZE)
            const copy: object = plainToInstance(cls, {...base, [property]: chunk}, options)
            return copy[property] as unknown[]
        })
        instance[property] = chunks.flat()
    }
    return instance
}

class ItemValidationErrors {
    constructor(readonly errors: ValidationError[]) {}
}

const objectExpected = 'Validation failed (object is expected)'

// items arrive as instances from ItemValidationPipe.transform
const itemTransformer: TransformerPackage = {
    plainToInstance: (cls, plain, options) => plain instanceof cls ? plain : plainToInstance(cls, plain, options),
    classToPlain: instanceToPlain,
}

class ItemValidationPipe extends ValidationPipe {
    async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
        if (value != null && typeof value == 'object' && !Array.isArray(value) && this.toValidate(metadata))
            value = await plainToInstanceInChunks(metadata.metatype, value, this.transformOptions)
        return super.transform(value, metadata)
    }

    protected validate(object: object, validatorOptions?: ValidatorOptions): Promise<ValidationError[]> {
        return validateInChunks(object, validatorOptions)
    }
}

/**
 * ValidationPipe for single items of a bulk body; its errors are collected by validateItem
 */
export function createItemValidationPipe(options?: ValidationPipeOptions): ValidationPipe {
    return new ItemValidationPipe({
        transform: true,
        validateCustomDecorators: true,
        ...options,
        transformerPackage: itemTransformer,
        exceptionFactory: (errors: ValidationError[]) => new ItemValidationErrors(errors.map(err =>
            err.constraints?.isObject == objectExpected ? {...err, property: ''} : err,
        )),
    })
}

/**
 * Validates and transforms one item of a request body; the errors are added to `errors` with pointers below `pointer`
 * @returns the transformed item, undefined if it is invalid
 */
export async function validateItem<T>(pipe: ValidationPipe, item: unknown, metatype: Type<T>, pointer: string, errors: ErrorEntry[]): Promise<T> {
    try {
        return await pipe.transform(item, {type: 'body', metatype}) as T
    } catch (err) {
        if (!(err instanceof ItemValidationErrors))
            throw err
        errors.push(...formatValidationErrors(err.errors, pointer))
        return undefined
    }
}
