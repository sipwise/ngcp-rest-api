import {Type} from '@nestjs/common'
import {DECORATORS} from '@nestjs/swagger'

import {modelFields} from '~/decorators/expand.decorator'
import {modelClass} from '~/decorators/response-model.decorator'

const LAZY_FIELDS_KEY = 'lazy:fields'

enum LazyMode {
    Lazy = 'lazy',
    NotLazy = 'not-lazy',
    LinkOnly = 'link-only',
}

/**
 * Top-level field of a response class rendered as a link to its `@<field>` collection unless inlined
 */
export interface LazyField {
    field: string
    // never inlined, no count: served by a dedicated `@<field>` route only
    linkOnly: boolean
    isArray: boolean
    // class of the items (arrays) or of the object; undefined for scalars
    itemClass?: Type<unknown>
}

interface SwaggerProperty {
    type?: unknown
    isArray?: boolean
}

function setFieldMode(prototype: object, field: string, mode: LazyMode): void {
    const own: Map<string, LazyMode> | undefined = Reflect.getOwnMetadata(LAZY_FIELDS_KEY, prototype)
    const fields = own ?? new Map(Reflect.getMetadata(LAZY_FIELDS_KEY, prototype) ?? [])
    fields.set(field, mode)
    if (!own)
        Reflect.defineMetadata(LAZY_FIELDS_KEY, fields, prototype)
}

function fieldDecorator(mode: LazyMode): PropertyDecorator {
    return (prototype: object, propertyKey: string | symbol): void =>
        setFieldMode(prototype, String(propertyKey), mode)
}

/**
 * An array field that is always returned inline (e.g. the `links` of a root index)
 */
export const NotLazy = (): PropertyDecorator => fieldDecorator(LazyMode.NotLazy)

/**
 * An object field that is lazy like the array fields: a link unless inlined, `@<field>` returns the object
 */
export const Lazy = (): PropertyDecorator => fieldDecorator(LazyMode.Lazy)

/**
 * A field that is only a link to its dedicated `@<field>` route: never inlined, no count
 */
export const LinkOnly = (): PropertyDecorator => fieldDecorator(LazyMode.LinkOnly)

const lazyFieldsByModel = new WeakMap<Type<unknown>, LazyField[]>()

/**
 * Lazy fields of a response class: its documented array fields without @NotLazy(), plus the @Lazy() and
 * @LinkOnly() fields
 */
export function lazyFields(model: Type<unknown> | undefined): LazyField[] {
    if (!model)
        return []
    if (lazyFieldsByModel.has(model))
        return lazyFieldsByModel.get(model)
    const modes: Map<string, LazyMode> = Reflect.getMetadata(LAZY_FIELDS_KEY, model.prototype) ?? new Map()
    const fields: LazyField[] = []
    for (const field of modelFields(model)) {
        const property: SwaggerProperty = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, model.prototype, field) ?? {}
        // design:type as well: the swagger CLI plugin of the build adds `isArray` to the metadata of array
        // fields documented without a type, tests run without it
        const isArray = property.isArray === true || property.type === 'array'
            || Reflect.getMetadata('design:type', model.prototype, field) === Array
        const mode = modes.get(field) ?? (isArray ? LazyMode.Lazy : undefined)
        if (mode == LazyMode.Lazy || mode == LazyMode.LinkOnly)
            fields.push({field, linkOnly: mode == LazyMode.LinkOnly, isArray, itemClass: modelClass(property.type)})
    }
    lazyFieldsByModel.set(model, fields)
    return fields
}

/**
 * Lazy field of a response class by name, also link-only ones; undefined if the field is not lazy
 */
export function lazyField(model: Type<unknown> | undefined, field: string): LazyField | undefined {
    return lazyFields(model).find(lazy => lazy.field == field)
}

/**
 * Items of a `<item>/@<field>` page as response objects: instances of the field's item class, scalars as
 * `{value: x}`
 */
export function lazyFieldItems(model: Type<unknown>, field: string, items: unknown[]): object[] {
    const itemClass = lazyField(model, field).itemClass as (new (item: unknown) => object) | undefined
    return items.map(item => itemClass ? new itemClass(item) : {value: item})
}
