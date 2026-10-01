import {readFile} from 'fs/promises'
import {join} from 'path'

import {InvoiceTemplateKnownVars, validateInvoiceTemplate} from './invoice-template.validator'
import {getInvoiceTemplateVars, substitutionVariables} from './invoice-template.vars'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

/**
 * Location of the default invoice templates
 *
 * - sources, unit and e2e tests: src/api/templates/invoices/defaults
 * - webpack bundle: copied to prod/invoice-templates (see webpack.config.js)
 */
const defaultsLocation = process.env.NODE_WP_BUNDLE
    ? join(__dirname, 'invoice-templates')
    : join(__dirname, 'defaults')

export const invoiceTemplateMimeType = 'image/svg+xml'

/**
 * Returns the default template content of the category
 */
export async function readDefaultInvoiceTemplate(category: InvoiceTemplateCategory): Promise<Buffer> {
    return await readFile(join(defaultsLocation, `${category}_invoice_template.svg`))
}

/**
 * Checks whether the provided content contains at least one <svg> element
 */
export function isSvgContent(content: string): boolean {
    return /<svg[\s>]/i.test(content)
}

/**
 * Sanitizes svg content
 *
 * - removes all <script> elements
 * - normalises `class="page layer"` (inkscape) to `class="page"`
 */
export function sanitizeSvg(content: string): string {
    return content
        .replace(/<script\b[^>]*\/>/gi, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/class="page layer"/gi, 'class="page"')
}

/**
 * Returns the root variables and their fields supported by the given category
 */
export function getKnownInvoiceTemplateVars(category: InvoiceTemplateCategory): InvoiceTemplateKnownVars {
    const vars = getInvoiceTemplateVars(category) as unknown as Record<string, unknown>
    return Object.fromEntries(substitutionVariables.map(name => [name, new Set(Object.keys(vars[name] as object))]))
}

/**
 * Validates the [% ... %] directives of a template against the variables of the category
 *
 * @returns list of validation errors, empty if the template is valid
 */
export function checkInvoiceTemplateDirectives(content: string, category: InvoiceTemplateCategory): string[] {
    const lists = category == InvoiceTemplateCategory.Customer ? ['calls'] : category == InvoiceTemplateCategory.Did ? ['did_zones'] : []
    return validateInvoiceTemplate(content, getKnownInvoiceTemplateVars(category), lists)
}
