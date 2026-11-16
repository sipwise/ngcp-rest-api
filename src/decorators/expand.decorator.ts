import {Type} from '@nestjs/common'
import {ApiExtension, DECORATORS} from '@nestjs/swagger'

import {expandConfig} from '~/config/expand.config'
import {modelClass} from '~/decorators/response-model.decorator'

const EXPAND_FIELDS_KEY = 'expand:fields'

// `expand=contact_id` adds `contact_id_expand`
export const EXPAND_SUFFIX = '_expand'

export const NO_EXPAND_KEY = 'expand:none'
// operations of @NoExpand() controllers, removed from the document by addExpandDocumentation
export const NO_EXPAND_EXTENSION = 'x-ngcp-no-expand'

export interface ExpandDeclaration {
    type: object
    field: string
    target: string
}

/**
 * Targets declared with @Expand(), checked against the controllers at startup
 */
export const expandDeclarations: ExpandDeclaration[] = []

function setFieldTarget(prototype: object, field: string, target: string | null): void {
    const own: Map<string, string | null> | undefined = Reflect.getOwnMetadata(EXPAND_FIELDS_KEY, prototype)
    const fields = own ?? new Map(Reflect.getMetadata(EXPAND_FIELDS_KEY, prototype) ?? [])
    fields.set(field, target)
    if (!own)
        Reflect.defineMetadata(EXPAND_FIELDS_KEY, fields, prototype)
}

function fieldTargets(prototype: object): Map<string, string | null> | undefined {
    return Reflect.getMetadata(EXPAND_FIELDS_KEY, prototype) as Map<string, string | null> | undefined
}

/**
 * Field expandable to a resource (`expand=<field>` adds `<field>_expand`), overriding the global mapping in
 * `expand.config.ts`
 * @param target resource path of the target collection, e.g. `rewrite-rules/sets`
 */
export function Expand(target: string): PropertyDecorator {
    return (prototype: object, propertyKey: string | symbol): void => {
        const field = String(propertyKey)
        setFieldTarget(prototype, field, target)
        expandDeclarations.push({type: prototype.constructor, field, target})
    }
}

/**
 * On a response DTO field: not expandable, also when its name is in the global mapping.
 * On a controller: expand is not applied to its routes.
 */
export function NoExpand(): ClassDecorator & PropertyDecorator {
    return (target: object, propertyKey?: string | symbol): void => {
        if (propertyKey === undefined) {
            Reflect.defineMetadata(NO_EXPAND_KEY, true, target)
            ApiExtension(NO_EXPAND_EXTENSION, true)(target)
        } else
            setFieldTarget(target, String(propertyKey), null)
    }
}

/**
 * Documented (@ApiProperty) fields of a response DTO class
 */
export function modelFields(model: Type<unknown>): string[] {
    const keys: string[] = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, model.prototype) ?? []
    return keys.map(key => key.replace(/^:/, ''))
}

/**
 * Target resource path of a field of a response DTO class: @Expand()/@NoExpand() of the class first, then the
 * global mapping for its documented fields; undefined if the field is not expandable
 */
export function modelFieldTarget(model: Type<unknown>, field: string): string | undefined {
    const fields = fieldTargets(model.prototype)
    if (fields?.has(field))
        return fields.get(field) ?? undefined
    return Object.hasOwn(expandConfig, field) && modelFields(model).includes(field)
        ? expandConfig[field].target
        : undefined
}

/**
 * DTO class of an object or array-of-objects field of a response DTO class
 */
export function modelFieldClass(model: Type<unknown>, field: string): Type<unknown> | undefined {
    const property: {type?: unknown} | undefined =
        Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, model.prototype, field)
    return modelClass(property?.type)
}
