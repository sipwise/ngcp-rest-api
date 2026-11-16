import {Type} from '@nestjs/common'
import {getSchemaPath} from '@nestjs/swagger'
import {
    OpenAPIObject,
    OperationObject,
    ParameterObject,
    SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'

import {
    EXPAND_SUFFIX,
    NO_EXPAND_EXTENSION,
    modelFieldClass,
    modelFieldTarget,
    modelFields,
} from '~/decorators/expand.decorator'
import {primaryRef} from '~/helpers/swagger-pdf.helper'

function schemaName(model: Type<unknown>): string {
    return getSchemaPath(model).split('/').pop()
}

/**
 * The response classes and the DTO classes of their object fields
 */
function withNestedClasses(models: Iterable<Type<unknown>>): Set<Type<unknown>> {
    const classes = new Set<Type<unknown>>()
    const add = (model: Type<unknown>): void => {
        if (classes.has(model))
            return
        classes.add(model)
        for (const field of modelFields(model)) {
            const nested = modelFieldClass(model, field)
            if (nested)
                add(nested)
        }
    }
    for (const model of models)
        add(model)
    return classes
}

function expandProperty(field: string, property: SchemaObject, target?: Type<unknown>): SchemaObject {
    const ref = target ? {$ref: getSchemaPath(target)} : {type: 'object'} as SchemaObject
    const description = `\`${field}\` resolved, with \`expand=${field}\``
    if (property.type == 'array')
        return {type: 'array', items: ref, description, readOnly: true}
    return {allOf: [ref], nullable: true, description, readOnly: true}
}

/**
 * Marks the expandable properties of the response schemas and adds their `<field>_expand` properties with
 * the schema of the target; returns the expandable fields per schema name
 */
function addExpandProperties(
    document: OpenAPIObject,
    models: Iterable<Type<unknown>>,
    targetModels: Map<string, Type<unknown> | undefined>,
): Map<string, string[]> {
    const expandable = new Map<string, string[]>()
    const schemas = document.components?.schemas ?? {}
    for (const model of withNestedClasses(models)) {
        const name = schemaName(model)
        const schema = schemas[name] as SchemaObject | undefined
        if (!schema?.properties || expandable.has(name))
            continue
        const fields: string[] = []
        for (const field of modelFields(model)) {
            const target = modelFieldTarget(model, field)
            const property = schema.properties[field] as SchemaObject | undefined
            if (!target || !property || '$ref' in property)
                continue
            fields.push(field)
            if (!property.description?.endsWith('(expandable)'))
                property.description = property.description ? `${property.description} (expandable)` : '(expandable)'
            schema.properties[`${field}${EXPAND_SUFFIX}`] = expandProperty(field, property, targetModels.get(target))
        }
        expandable.set(name, fields.sort())
    }
    return expandable
}

function responseSchemaName(operation: OperationObject): string | undefined {
    for (const code of ['200', '201']) {
        const response = operation.responses?.[code]
        if (!response || '$ref' in response)
            continue
        for (const content of Object.values(response.content ?? {})) {
            const name = primaryRef(content.schema)
            if (name)
                return name
        }
    }
    return undefined
}

function expandParameters(fields: string[]): ParameterObject[] {
    const list = fields.map(field => `\`${field}\``).join(', ')
    return [
        {
            name: 'expand',
            in: 'query',
            required: false,
            description: `Fields to resolve, comma separated: ${list}. Each is added as \`<field>_expand\`, a dot `
                + `resolves the added item further (\`${fields[0]}.<field>\`), \`all\` resolves every field the user `
                + 'may read. See "Related resources" in Concepts.',
            schema: {type: 'string'},
        },
        {
            name: 'soft_expand',
            in: 'query',
            required: false,
            description: '`true`: only what can be expanded is added, fields and items that cannot be expanded or '
                + 'read are left out instead of the 400, 422 or 403 error (a malformed `expand` stays 400).',
            schema: {type: 'boolean'},
        },
    ]
}

/**
 * Documents expand: `<field>_expand` properties with the target schema, the `(expandable)` note and the
 * `expand`/`soft_expand` parameters of the operations whose response has expandable fields
 * @param models response DTO classes of all routes
 * @param targetModels response DTO classes of the expand targets by resource path
 */
export function addExpandDocumentation(
    document: OpenAPIObject,
    models: Iterable<Type<unknown>>,
    targetModels: Map<string, Type<unknown> | undefined>,
): void {
    const expandable = addExpandProperties(document, models, targetModels)
    for (const pathItem of Object.values(document.paths)) {
        const operation = pathItem.get
        const fields = operation && !operation[NO_EXPAND_EXTENSION]
            ? expandable.get(responseSchemaName(operation)) ?? []
            : []
        if (fields.length) {
            operation.parameters = (operation.parameters ?? [])
                .filter(param => '$ref' in param || !['expand', 'soft_expand'].includes(param.name))
            operation.parameters.push(...expandParameters(fields))
        }
        for (const operation of Object.values(pathItem) as unknown[]) {
            if (typeof operation == 'object' && operation)
                delete operation[NO_EXPAND_EXTENSION]
        }
    }
}
