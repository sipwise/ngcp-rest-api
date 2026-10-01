import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'

import {InvoiceTemplateRenderError, num, numToString} from './invoice-format'
import {renderInvoiceLayout} from './invoice-layout'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

export {InvoiceTemplateRenderError}

/**
 * The pdf generation failed
 */
export class InvoiceTemplatePdfError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'InvoiceTemplatePdfError'
    }
}

/**
 * Removes the display attribute of the page layers (svg editors hide inactive layers)
 */
export function preprocessSvg(svg: string): string {
    return svg.replace(/<g\b[^>]*>/g, tag => /\sclass\s*=\s*(?:"page"|'page')/.test(tag)
        ? tag.replace(/\sdisplay\s*=\s*(?:"[^"]*"|'[^']*')/, '')
        : tag)
}

/**
 * Renders the template with the given variables, returns the svg with all pages
 *
 * @throws InvoiceTemplateRenderError if the template contains unsupported expressions or markers
 */
export function renderInvoiceTemplate(template: string, vars: Record<string, unknown>, category: InvoiceTemplateCategory): string {
    return renderInvoiceLayout(preprocessSvg(template), vars, category)
}

const escapeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Converts the vars to the values of the renderer: plain data with xml escaped strings
 */
export function toTemplateVars(vars: object): Record<string, unknown> {
    const convert = (value: unknown): unknown => {
        if (typeof value == 'string')
            return escapeXml(value)
        if (Array.isArray(value))
            return value.map(convert)
        if (value !== null && typeof value == 'object')
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v)]))
        return value
    }
    return convert(JSON.parse(JSON.stringify(vars))) as Record<string, unknown>
}

interface Mark {
    firsty: number
    lasty: number
}

function attributeOf(tag: string, name: string): string | undefined {
    const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag)
    return m ? (m[1] ?? m[2]) : undefined
}

/**
 * Shifts the y coordinates of the list footer groups (firsty-N lasty-M) to the end of the
 * dynamic lists
 */
function shiftTag(tag: string, marks: Mark[], units: string): string {
    for (const mark of marks) {
        for (const attr of ['y', 'y1', 'y2']) {
            const value = attributeOf(tag, attr)
            if (value === undefined || !truthy(value))
                continue
            const a = value.replace(/^(\d+)\w*$/, '$1')
            const y = mark.lasty + (num(a) - mark.firsty)
            tag = tag
                .replace(new RegExp(`\\s${attr}\\s*=\\s*(?:"[^"]*"|'[^']*')`), '')
                .replace(/\s*(\/?)>$/, ` ${attr}="${numToString(y)}${units}"$1>`)
        }
    }
    return tag
}

const truthy = (v: string): boolean => v !== '' && v !== '0'

/**
 * Splits the svg into pages and applies the list footer positions
 */
export function preprocessSvgPages(svg: string): string[] {
    const pages: string[] = svg.match(/<svg[\s\S]*?\/svg>/gi) ?? []
    return pages.map((page): string => {
        const units = attributeOf(page, 'server-process-units') ?? ''
        const suffix = units != 'none' ? 'mm' : ''
        const stack: (Mark[] | null)[] = []
        const activeMarks = (): Mark[] => {
            const marks: Mark[] = []
            for (const m of stack)
                marks.push(...(m ?? []))
            return marks
        }
        return page.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g, (all: string, closing: string | undefined, name: string | undefined): string => {
            if (name === undefined)
                return all
            if (closing) {
                stack.pop()
                return all
            }
            const selfClosing = all.endsWith('/>')
            let tag = all
            let mark: Mark | null = null
            if (name == 'g') {
                const cls = attributeOf(all, 'class') ?? ''
                if (cls.includes('firsty-') && cls.includes('lasty')) {
                    const firsty = /^.+firsty-(\d+).*$/s.exec(cls)?.[1]
                    const lasty = /^.+lasty-(\d+).*$/s.exec(cls)?.[1]
                    mark = {firsty: num(firsty ?? cls), lasty: num(lasty ?? cls)}
                }
            }
            const marks = [...activeMarks(), ...(mark ? [mark] : [])]
            if (marks.length)
                tag = shiftTag(tag, marks, suffix)
            if (!selfClosing)
                stack.push(mark ? [mark] : null)
            return tag
        })
    })
}

const a4 = {width: 595.28, height: 841.89}

// the layouts use Verdana, the pdf standard fonts are used instead
const pdfFont = (_family: string, bold: boolean, italic: boolean): string =>
    `Helvetica${bold ? '-Bold' : ''}${italic ? (bold ? 'Oblique' : '-Oblique') : ''}`

/**
 * Converts the rendered svg to a pdf with one A4 page per svg page
 */
export async function svgToPdf(svg: string): Promise<Buffer> {
    const pages = preprocessSvgPages(svg)
    if (!pages.length)
        throw new InvoiceTemplateRenderError('the rendered template does not contain any svg page')

    try {
        const doc = new PDFDocument({size: 'A4', autoFirstPage: false, margin: 0})
        const chunks: Buffer[] = []
        const done = new Promise<Buffer>((resolve, reject) => {
            doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', reject)
        })
        for (const page of pages) {
            doc.addPage({size: 'A4', margin: 0})
            SVGtoPDF(doc, page, 0, 0, {...a4, fontCallback: pdfFont, preserveAspectRatio: 'xMidYMid meet'})
        }
        doc.end()
        return await done
    } catch (e) {
        throw new InvoiceTemplatePdfError(`pdf generation failed: ${(e as Error).message}`.slice(0, 500))
    }
}
