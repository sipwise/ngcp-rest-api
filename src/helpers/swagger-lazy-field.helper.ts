import {Type} from '@nestjs/common'
import {
    OpenAPIObject,
    OperationObject,
    ParameterObject,
    ReferenceObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'

import {paginatedSchema} from '~/decorators/api-paginated-response.decorator'
import {SEARCH_QUERY_ORDER_KEY, SearchQueryParam, searchQueryParams} from '~/decorators/api-search-query.decorator'
import {lazyFields} from '~/decorators/lazy.decorator'
import {inlineMaxHardLimit, inlineMaxItems} from '~/helpers/lazy-field.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {responseSchemaName, schemaName} from '~/helpers/swagger-expand.helper'
import {LazyFieldRoute} from '~/interceptors/lazy-field.interceptor'

const LINK_SCHEMA = 'LazyFieldLink'
const FIELD_PATH_SUFFIX = '/@{field}'
// `/<item>s/{id}/@{field}` of the `<item>/@:field` routes
const ITEM_FIELD_PATH = /\/([a-z]+)s\/\{id\}\/@\{field\}$/
// without a search DTO the field's collection takes no filters and no order_by
const PAGING_PARAMS = [
    'page',
    'rows',
]

const LINK_SCHEMA_OBJECT: SchemaObject = {
    type: 'object',
    description: 'A lazy field that is not inlined: the url of its collection (`GET <item>/@<field>`)',
    required: [
        'type',
        'url',
    ],
    properties: {
        type: {type: 'string', enum: ['link'], description: 'Always `link`'},
        url: {type: 'string', description: 'Url of the field\'s collection', example: '/api/v2/subscribers/1/@alias_numbers'},
        total_count: {type: 'number', description: 'Number of items of the field (not on link-only fields)'},
    },
}

function schemaType(type: unknown): string {
    if (type === Number)
        return 'number'
    if (type === Boolean)
        return 'boolean'
    return typeof type == 'string' ? type : 'string'
}

function queryParameter(param: SearchQueryParam): ParameterObject {
    const schema: SchemaObject = {type: schemaType(param.type)}
    if (param.enum)
        schema.enum = Array.isArray(param.enum) ? param.enum : Object.values(param.enum)
    if (param.default !== undefined)
        schema.default = param.default
    return {
        name: param.name,
        in: 'query',
        required: false,
        description: param.description,
        schema,
        [SEARCH_QUERY_ORDER_KEY]: param[SEARCH_QUERY_ORDER_KEY],
    } as ParameterObject
}

function searchParameters(search?: Type<unknown>): ParameterObject[] {
    const params = search
        ? searchQueryParams(SearchLogic, search)
        : searchQueryParams(SearchLogic).filter(param => PAGING_PARAMS.includes(param.name))
    return params.map(queryParameter)
}

/**
 * Data schema of a lazy field's collection items: the item schema, scalars as `{value: x}`
 */
function itemSchema(property: SchemaObject): SchemaObject | ReferenceObject {
    const items = property.items ?? {}
    if ('$ref' in items)
        return items
    return {type: 'object', required: ['value'], properties: {value: items}}
}

function fieldOperation(route: OperationObject, itemParam: string, field: string, property: SchemaObject,
    search?: Type<unknown>): OperationObject {
    const pathParams = (route.parameters ?? [])
        .filter(param => '$ref' in param || param.name != 'field')
        .map(param => '$ref' in param || param.in != 'path' || param.name != 'id' ? param : {...param, name: itemParam})
    return {
        ...route,
        operationId: `${route.operationId}_${field}`,
        description: `\`${field}\` of the item as a collection: the \`url\` of the field's link. See "Lazy fields" `
            + 'in Concepts.',
        parameters: [...pathParams, ...searchParameters(search)],
        responses: {
            200: {
                description: '',
                content: {
                    'application/json': {
                        schema: paginatedSchema(itemSchema(property)),
                    },
                },
            },
        },
    }
}

/**
 * Name of the item's `{id}` in its field operations, after the item like the parent ids of nested paths
 * (`/customers/{customerId}/phonebook`): `/subscribers/{subscriberId}/@alias_numbers`. Keeps it apart from the
 * `id` filter of the field's collection.
 */
function itemParamName(path: string): string {
    const item = ITEM_FIELD_PATH.exec(path)?.[1]
    if (!item)
        throw new Error(`lazy: ${path} does not end with '/<item>s/{id}${FIELD_PATH_SUFFIX}'`)
    return `${item}Id`
}

/**
 * Replaces the `<item>/@:field` GET routes by one operation per lazy field (`.../{subscriberId}/@alias_numbers`),
 * with the paginated items and the filters of the field's source. Runs before the expand documentation, which adds
 * `expand` to them where the item schema has expandable fields.
 */
export function addLazyFieldOperations(document: OpenAPIObject, routes: LazyFieldRoute[]): void {
    const schemas = document.components?.schemas ?? {}
    for (const path of Object.keys(document.paths).filter(path => path.endsWith(FIELD_PATH_SUFFIX))) {
        const route = document.paths[path].get
        const fieldRoute = routes.find(fieldRoute => fieldRoute.operationId == route?.operationId)
        if (!fieldRoute)
            throw new Error(`lazy: no lazy field route for ${path}`)
        delete document.paths[path]
        const properties = (schemas[schemaName(fieldRoute.model)] as SchemaObject).properties
        const itemParam = itemParamName(path)
        for (const lazy of lazyFields(fieldRoute.model).filter(lazy => !lazy.linkOnly)) {
            const operation = fieldOperation(route, itemParam, lazy.field, properties[lazy.field] as SchemaObject,
                fieldRoute.sources[lazy.field].search)
            document.paths[path.replace(`/{id}${FIELD_PATH_SUFFIX}`, `/{${itemParam}}/@${lazy.field}`)] = {get: operation}
        }
    }
}

function inlineParameter(fields: string[]): ParameterObject {
    const list = fields.map(field => `\`${field}\``).join(', ')
    return {
        name: 'inline',
        in: 'query',
        required: false,
        description: `Lazy fields to return as data instead of a link, comma separated: ${list}. \`all\` inlines `
            + `every lazy field, \`auto\` each one with at most ${inlineMaxItems()} items, in page order while the `
            + `response holds at most ${inlineMaxHardLimit()} inlined items, and returns the others as links. Named `
            + 'fields and `all` above either limit are rejected. See "Lazy fields" in Concepts.',
        schema: {type: 'string'},
    }
}

/**
 * Documents lazy fields: the properties of the response schemas become `oneOf` the link and the data (link-only
 * fields: the link), and the GET operations returning them take `inline`. Runs after the expand documentation,
 * which reads the data schemas.
 * @param models response DTO classes of all routes
 */
export function addLazyFieldDocumentation(document: OpenAPIObject, models: Iterable<Type<unknown>>): void {
    const schemas = document.components?.schemas ?? {}
    schemas[LINK_SCHEMA] = LINK_SCHEMA_OBJECT
    const link = {$ref: `#/components/schemas/${LINK_SCHEMA}`}
    const inlineFields = new Map<string, string[]>()
    for (const model of models) {
        const name = schemaName(model)
        const schema = schemas[name] as SchemaObject | undefined
        const fields = lazyFields(model)
        if (!schema?.properties || !fields.length)
            continue
        for (const lazy of fields) {
            const {description, ...data} = schema.properties[lazy.field] as SchemaObject
            schema.properties[lazy.field] = lazy.linkOnly
                ? {description, allOf: [link]}
                : {description, oneOf: [link, data]}
        }
        inlineFields.set(name, fields.filter(lazy => !lazy.linkOnly).map(lazy => lazy.field).sort())
    }
    for (const pathItem of Object.values(document.paths)) {
        const fields = pathItem.get ? inlineFields.get(responseSchemaName(pathItem.get)) ?? [] : []
        if (fields.length)
            pathItem.get.parameters = [...pathItem.get.parameters ?? [], inlineParameter(fields)]
    }
}
