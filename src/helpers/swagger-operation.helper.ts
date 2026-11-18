import {OpenAPIObject, OperationObject, ParameterObject} from '@nestjs/swagger'

const OPERATION_METHODS = ['get', 'put', 'post', 'delete', 'patch'] as const

interface Noun {
    singular: string
    plural: string
}

// path segments (or static parts of a path) whose nouns don't follow from their words
const NOUNS: Record<string, Noun> = {
    'auth/tokens': {singular: 'auth token', plural: 'auth tokens'},
    'bans/admins': {singular: 'admin ban', plural: 'admin bans'},
    'bans/ips': {singular: 'IP ban', plural: 'IP bans'},
    'bans/registrations': {singular: 'registration ban', plural: 'registration bans'},
    'bans/subscribers': {singular: 'subscriber ban', plural: 'subscriber bans'},
    'customercontacts': {singular: 'customer contact', plural: 'customer contacts'},
    'customerspeeddials': {singular: 'customer speed dial', plural: 'customer speed dials'},
    'fileshare': {singular: 'file', plural: 'files'},
    'journals': {singular: 'journal entry', plural: 'journal entries'},
    'ncos': {singular: 'NCOS', plural: 'NCOS'},
    'pbx': {singular: 'PBX', plural: 'PBX'},
    'phonebook': {singular: 'phonebook entry', plural: 'phonebook entries'},
    'systemcontacts': {singular: 'system contact', plural: 'system contacts'},
    'templates/invoices': {singular: 'invoice template', plural: 'invoice templates'},
}

// summaries of the CrudController methods; `{plural}` and `{one}` (with its article) take the resource noun
const SUMMARIES: Record<string, string> = {
    readAll: 'List {plural}',
    read: 'Get {one}',
    create: 'Create {plural}',
    update: 'Replace {one}',
    updateMany: 'Replace {plural}',
    adjust: 'Update {one}',
    adjustMany: 'Update {plural}',
    delete: 'Delete {plural}',
}

function nounOf(segments: string[]): Noun {
    const known = NOUNS[segments.join('/')]
    if (known)
        return known
    if (segments.length > 1) {
        const modifiers = segments.slice(0, -1).map(segment => nounOf([segment]).singular).join(' ')
        const head = nounOf(segments.slice(-1))
        return {singular: `${modifiers} ${head.singular}`, plural: `${modifiers} ${head.plural}`}
    }
    const plural = segments[0].replace(/-/g, ' ')
    return {singular: plural.replace(/ies$/, 'y').replace(/s$/, ''), plural}
}

function withArticle(noun: string): string {
    return (/^([aeioAEIOU]|[FHLMNRSX][A-Z])/.test(noun) ? 'an ' : 'a ') + noun
}

/**
 * The resources of a path: the static segments between its parameters, e.g. `/ncos/sets/{setId}/levels/{id}`
 * has `ncos/sets` and `levels`
 */
function resourceGroups(path: string): string[][] {
    const groups: string[][] = [[]]
    for (const segment of path.split('/').filter(segment => segment)) {
        if (segment.startsWith('{'))
            groups.push([])
        else
            groups[groups.length - 1].push(segment)
    }
    return groups.filter(group => group.length)
}

// the resource of a group named with its parents (`NCOS set level`)
function qualifiedNoun(groups: string[][], index: number): Noun {
    return nounOf(groups.slice(0, index + 1).flat())
}

function generatedSummary(path: string, operation: OperationObject): string | undefined {
    const groups = resourceGroups(path.replace(/\/(journal|@\w+)$/, ''))
    const last = groups.length - 1
    const item = withArticle(qualifiedNoun(groups, last).singular)
    const field = /\/@(\w+)$/.exec(path)?.[1]
    if (field)
        return `List ${field.split('_').map(word => NOUNS[word]?.plural ?? word).join(' ')} of ${item}`
    if (path.endsWith('/journal'))
        return `List journal entries of ${item}`
    const template = SUMMARIES[operation.operationId?.split('_')[1]]
    if (!template)
        return undefined
    // nested resources as `<resource> of <parent>`
    const head = last ? nounOf(groups[last]) : qualifiedNoun(groups, 0)
    const parent = last ? ` of ${withArticle(qualifiedNoun(groups, last - 1).singular)}` : ''
    return template.replace('{plural}', head.plural).replace('{one}', withArticle(head.singular)) + parent
}

/**
 * Summaries of the CrudController routes, journal and `@<field>` routes from their path, e.g. "List levels of
 * an NCOS set"; `@ApiOperation({summary})` on a route takes precedence
 */
export function addOperationSummaries(document: OpenAPIObject, prefix: string): void {
    for (const [path, pathItem] of Object.entries(document.paths)) {
        for (const method of OPERATION_METHODS) {
            const operation = pathItem[method]
            if (operation && !operation.summary)
                operation.summary = generatedSummary(withoutPrefix(path, prefix), operation)
        }
    }
}

/**
 * Path parameters of every operation, described by their resource ("Id of the NCOS set"): routes whose
 * parameters swagger doesn't see (bulk routes of nested resources, `@ParamOrBody`) get them with the schema of
 * another operation on the same path
 */
export function addPathParameters(document: OpenAPIObject, prefix: string): void {
    const schemas = new Map<string, ParameterObject['schema']>()
    for (const [path, pathItem] of Object.entries(document.paths)) {
        for (const method of OPERATION_METHODS) {
            for (const param of pathItem[method]?.parameters ?? []) {
                if (!('$ref' in param) && param.in == 'path' && param.schema)
                    schemas.set(pathPrefix(path, param.name), param.schema)
            }
        }
    }
    for (const [path, pathItem] of Object.entries(document.paths)) {
        const groups = resourceGroups(withoutPrefix(path, prefix))
        const names = [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1])
        for (const method of OPERATION_METHODS) {
            const operation = pathItem[method]
            if (!operation)
                continue
            const declared = (operation.parameters ?? []).filter(param => '$ref' in param || param.in != 'path')
            const pathParams = names.map((name, index): ParameterObject => {
                const param = (operation.parameters ?? []).find(p => !('$ref' in p) && p.in == 'path' && p.name == name) as ParameterObject
                return {
                    ...param,
                    name,
                    in: 'path',
                    required: true,
                    description: param?.description || `Id of the ${qualifiedNoun(groups, index).singular}`,
                    schema: param?.schema ?? schemas.get(pathPrefix(path, name)) ?? {type: 'string'},
                }
            })
            operation.parameters = [...pathParams, ...declared]
        }
    }
}

// the path without the global prefix of the routes (`/api/admins` -> `/admins`)
function withoutPrefix(path: string, prefix: string): string {
    return path.startsWith(`/${prefix}/`) ? path.slice(prefix.length + 1) : path
}

function pathPrefix(path: string, name: string): string {
    return path.slice(0, path.indexOf(`{${name}}`))
}
