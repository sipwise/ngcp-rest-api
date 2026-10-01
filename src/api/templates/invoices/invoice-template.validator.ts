import {
    dateNowPattern,
    derivedVariables,
    layoutMarkers,
    markerPattern,
    pathPattern,
    substitutionPattern,
} from './invoice-layout'

/**
 * Static validation of invoice svg templates.
 *
 * A template may only contain
 * - value substitutions `[% path.to.value %]` of the variables of the invoice category (and the derived values)
 * - `[% date_now(format='...') %]`
 * - the layout markers (`<!--@zones-->`, ...) supported by the category
 */

export interface InvoiceTemplateKnownVars {
    // root variable name -> known member names, or null when members are not checked
    [name: string]: Set<string> | null
}

// hash methods, allowed as members of the known invoice variables
const objectMethods = new Set(['keys', 'values', 'size', 'length', 'first', 'last'])

// markers which depend on the variables of the category
const markerRequires: Record<string, string> = {
    'calls': 'calls',
    'did-zones': 'did_zones',
    'foreach-did': 'did_zones',
}

// variables which are always available
const alwaysKnown: InvoiceTemplateKnownVars = {
    aux: new Set(['page', 'lasty']),
    ...Object.fromEntries(derivedVariables.map(name => [name, null])),
}

/**
 * Validates an invoice template and returns a list of errors, an empty list means the template is valid
 *
 * @param content template content
 * @param knownVars variables which can be substituted in the invoice category
 * @param lists lists consumed by the layout markers of the invoice category (calls, did_zones)
 */
export function validateInvoiceTemplate(content: string, knownVars: InvoiceTemplateKnownVars, lists: readonly string[] = []): string[] {
    const errors: string[] = []
    const known = {...alwaysKnown, ...knownVars}

    // layout markers
    let depth = 0
    let background = false
    for (const m of content.matchAll(markerPattern)) {
        const name = m[1]
        if (!(layoutMarkers as readonly string[]).includes(name)) {
            errors.push(`unsupported marker '${m[0]}'`)
            continue
        }
        const requires = markerRequires[name]
        if (requires && !lists.includes(requires))
            errors.push(`marker '${m[0]}' is not supported by this category`)
        if (name == 'define-background') {
            if (background)
                errors.push('the background is defined more than once')
            background = true
            depth++
        } else if (name == 'foreach-did') {
            depth++
        } else if (name == 'end') {
            if (--depth < 0) {
                errors.push(`unexpected marker '${m[0]}'`)
                depth = 0
            }
        }
    }
    if (depth > 0)
        errors.push('missing marker \'<!--@end-->\'')
    if (/<!--@[^>]*-->/.test(content.replace(markerPattern, '')))
        errors.push('unsupported marker syntax')

    // substitutions
    const unknownVariables = new Set<string>()
    const unknownFields = new Set<string>()
    const unsupported = new Set<string>()
    for (const m of content.matchAll(substitutionPattern)) {
        const expr = m[1].trim()
        if (dateNowPattern.test(expr))
            continue
        if (!pathPattern.test(expr)) {
            unsupported.add(expr)
            continue
        }
        const [root, member] = expr.split('.')
        if (!(root in known)) {
            unknownVariables.add(root)
            continue
        }
        const members = known[root]
        if (member !== undefined && members && !members.has(member) && !objectMethods.has(member))
            unknownFields.add(`${root}.${member}`)
    }
    if (/\[%/.test(content.replace(substitutionPattern, '')))
        errors.push('unterminated [% directive')

    for (const expr of unsupported)
        errors.push(`unsupported expression '${expr}'`)
    for (const name of [...unknownVariables].sort())
        errors.push(`unknown variable '${name}'`)
    for (const name of [...unknownFields].sort())
        errors.push(`unknown field '${name}'`)
    return errors
}
