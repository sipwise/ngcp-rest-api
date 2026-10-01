import {InvoiceTemplateRenderError, formatDate, num, numToString, str} from './invoice-format'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

/**
 * Renderer of the invoice svg templates.
 *
 * A template is a plain svg with
 * - value substitutions `[% path.to.value %]` and `[% date_now(format='%Y-%m-%d') %]`
 * - layout markers, which are xml comments: `<!--@background-->`, `<!--@zones-->`, ...
 *
 * The lists, page breaks and footer positions are fixed, the list columns depend on the category.
 */

const pageWidth = 210
const pageHeight = 297
const lastyAdvance = 56.7

export const layoutMarkers = [
    // definition of the background, which is repeated on every page
    'define-background',
    // draws the background
    'background',
    // dynamic lists
    'zones',
    'did-zones',
    'calls',
    // moves the position of the following footer below the list
    'advance',
    // starts a new page if the following footer does not fit on the page
    'pagebreak',
    // unconditional new page
    'newpage',
    // repeats the enclosed part for every did subscriber
    'foreach-did',
    'end',
] as const

export type LayoutMarker = typeof layoutMarkers[number]

export const markerPattern = /<!--@([a-z-]+)-->/g

/**
 * Derived values that can be used in templates in addition to the invoice variables
 */
export const derivedVariables = ['fixfee', 'zonefee', 'netfee', 'vatfee', 'allfee', 'cur', 'p_start', 'p_end'] as const

/**
 * Derived values of the invoice variables, for the did category the zone fee is replaced per did while rendering
 */
export function getDerivedVariables(vars: Record<string, unknown>): Record<typeof derivedVariables[number], unknown> {
    const invoice = isObject(vars.invoice) ? vars.invoice : {}
    const billprof = isObject(vars.billprof) ? vars.billprof : {}
    const zones = isObject(vars.zones) ? vars.zones : {}
    return {
        fixfee: moneyFormat(billprof.interval_charge),
        zonefee: moneyFormat(zones.totalcost),
        netfee: moneyFormat(invoice.amount_net),
        vatfee: moneyFormat(invoice.amount_vat),
        allfee: moneyFormat(invoice.amount_total),
        cur: billprof.currency,
        p_start: periodDate(invoice.period_start),
        p_end: periodDate(invoice.period_end),
    }
}

interface Column {
    name: string
    // distance to the previous column
    dx: number
    anchor?: 'end'
    format?: (value: unknown) => string
}

interface ListLayout {
    startx: number
    starty: number
    offsety: number
    miny: number
    maxy: number
    columns: Column[]
}

const costField: Record<InvoiceTemplateCategory, string> = {
    [InvoiceTemplateCategory.Customer]: 'customercost',
    [InvoiceTemplateCategory.Did]: 'customercost',
    [InvoiceTemplateCategory.Peer]: 'carriercost',
    [InvoiceTemplateCategory.Reseller]: 'resellercost',
}

const zoneColumns = (category: InvoiceTemplateCategory): Column[] => [
    {name: 'zone', dx: 0},
    {name: 'number', dx: 221, anchor: 'end'},
    {name: 'duration', dx: 99, anchor: 'end', format: timestamp2time},
    {name: costField[category], dx: 156, anchor: 'end', format: value => moneyFormat(value, 3)},
]

const callColumns: Column[] = [
    {name: 'start_time', dx: 0, format: value => formatDate(value, '%Y-%m-%d %H:%M:%S')},
    {name: 'duration', dx: 141.175, anchor: 'end', format: timestamp2time},
    {name: 'destination_user_in', dx: 28.35, format: maskNumber},
    {name: 'zone', dx: 113.4},
    {name: 'cost', dx: 192.78, anchor: 'end', format: value => moneyFormat(value, 5)},
]

const pagebreak = {followingHeight: 141.75, miny: 141.75, maxy: 708.75}

type Values = Record<string, unknown>

const isObject = (v: unknown): v is Values => v !== null && typeof v == 'object' && !Array.isArray(v)

/**
 * Money amount in cents to a decimal string with the given number of decimal places (2 = cents)
 */
export function moneyFormat(cents: unknown, decimals = 2): string {
    const amount = num(cents)
    const rest = Math.round(Math.abs(amount % 100) * 10 ** (decimals - 2))
    return `${amount < 0 ? '-' : ''}${Math.trunc(Math.abs(amount) / 100)}.${String(rest).padStart(decimals, '0')}`
}

/**
 * Seconds to hh:mm:ss
 */
export function timestamp2time(seconds: unknown): string {
    const total = Math.max(Math.trunc(num(seconds)), 0)
    return [Math.trunc(total / 3600), Math.trunc(total % 3600 / 60), total % 60].map(n => String(n).padStart(2, '0')).join(':')
}

/**
 * Phone number with a '+' prefix, masked after the first 9 characters
 */
function maskNumber(value: unknown): string {
    const text = '+' + str(value)
    return text.slice(0, Math.min(10, text.length) - 1) + 'xxx'
}

/**
 * Formats the derived date value of the invoice period (ISO strings in UTC)
 */
function periodDate(value: unknown): string {
    const d = new Date(str(value))
    if (Number.isNaN(d.getTime()))
        return ''
    return formatDate(d.getTime() / 1000, '%Y-%m-%d', true)
}

type Node =
    | {t: 'text', v: string}
    | {t: 'marker', name: LayoutMarker}
    | {t: 'foreach', body: Node[]}

/**
 * Splits the template into nodes, extracts the background definition
 */
function parseTemplate(template: string): {nodes: Node[], background: string} {
    const root: Node[] = []
    const stack: Node[][] = [root]
    let background: string | undefined
    let last = 0
    let inBackground: string[] | undefined

    const pushText = (text: string): void => {
        if (!text.length)
            return
        if (inBackground)
            inBackground.push(text)
        else
            stack[stack.length - 1].push({t: 'text', v: text})
    }

    for (const m of template.matchAll(markerPattern)) {
        pushText(template.slice(last, m.index))
        last = m.index + m[0].length
        const name = m[1] as LayoutMarker
        if (!layoutMarkers.includes(name))
            throw new InvoiceTemplateRenderError(`unknown marker '${m[0]}'`)

        if (inBackground) {
            if (name != 'end')
                throw new InvoiceTemplateRenderError(`marker '${m[0]}' is not allowed in the background definition`)
            background = inBackground.join('')
            inBackground = undefined
        } else if (name == 'define-background') {
            inBackground = []
        } else if (name == 'foreach-did') {
            const node: Node = {t: 'foreach', body: []}
            stack[stack.length - 1].push(node)
            stack.push(node.body)
        } else if (name == 'end') {
            if (stack.length < 2)
                throw new InvoiceTemplateRenderError(`unexpected marker '${m[0]}'`)
            stack.pop()
        } else {
            stack[stack.length - 1].push({t: 'marker', name})
        }
    }
    pushText(template.slice(last))

    if (inBackground || stack.length > 1)
        throw new InvoiceTemplateRenderError('missing <!--@end--> marker')
    return {nodes: root, background: background ?? ''}
}

class Renderer {
    private readonly out: string[] = []
    private readonly aux: Values = {page: 1}
    private readonly derived: Values = {}
    private did: unknown

    constructor(
        private readonly vars: Values,
        private readonly category: InvoiceTemplateCategory,
        private readonly background: string,
    ) {
        Object.assign(this.derived, getDerivedVariables(vars))
    }

    run(nodes: Node[]): string {
        this.exec(nodes)
        return this.out.join('')
    }

    private exec(nodes: Node[]): void {
        for (const node of nodes) {
            switch (node.t) {
                case 'text':
                    this.emit(node.v)
                    break
                case 'foreach': {
                    const list = this.vars.did_zones
                    for (const item of Array.isArray(list) ? list : []) {
                        this.did = item
                        this.derived.zonefee = moneyFormat(isObject(item) ? item.totalcost : 0)
                        this.exec(node.body)
                    }
                    break
                }
                case 'marker':
                    this.marker(node.name)
                    break
            }
        }
    }

    private marker(name: LayoutMarker): void {
        switch (name) {
            case 'background':
                this.emit(this.background)
                break
            case 'zones':
                this.list(isObject(this.vars.zones) ? this.vars.zones.data : [], {
                    startx: 62, starty: 507, offsety: 14, miny: 113.4, maxy: 709, columns: zoneColumns(this.category),
                })
                break
            case 'did-zones':
                this.list(isObject(this.did) ? this.did.data : [], {
                    startx: 62.37, starty: 184.275, offsety: 14, miny: 113.4, maxy: 737, columns: zoneColumns(this.category),
                })
                break
            case 'calls':
                this.list(this.vars.calls, {
                    startx: 62.37, starty: 184.275, offsety: 14, miny: 113.4, maxy: 737, columns: callColumns,
                })
                break
            case 'advance':
                this.aux.lasty = num(this.aux.lasty) + lastyAdvance
                break
            case 'pagebreak':
                if (pagebreak.maxy <= num(this.aux.lasty) + pagebreak.followingHeight) {
                    this.svgClose(true)
                    this.svgOpen(true)
                    this.aux.lasty = pagebreak.miny
                }
                break
            case 'newpage':
                this.svgClose(false)
                this.svgOpen(false)
                break
            default:
                throw new InvoiceTemplateRenderError(`unexpected marker '<!--@${name}-->'`)
        }
    }

    private svgOpen(openGroup: boolean): void {
        this.aux.page = num(this.aux.page) + 1
        this.out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 595 842" server-process-units="none">`)
        this.emit(this.background)
        if (openGroup)
            this.out.push('<g x="0" y="0">')
    }

    private svgClose(closeGroup: boolean): void {
        this.out.push(closeGroup ? '</g></svg>' : '</svg>')
    }

    /**
     * Writes a list as text elements, continues on a new page at the end of a page
     */
    private list(items: unknown, layout: ListLayout): void {
        let y = layout.starty
        for (const item of Array.isArray(items) ? items : []) {
            let x = layout.startx
            for (const column of layout.columns) {
                x += column.dx
                const value: unknown = isObject(item) ? item[column.name] : undefined
                const text = column.format ? column.format(value) : str(value)
                this.out.push(`<text font-family="Verdana" font-size="8" x="${numToString(x)}" y="${numToString(y)}" text-anchor="${column.anchor ?? 'start'}">${text}</text>`)
            }
            y += layout.offsety
            if (y >= layout.maxy) {
                this.svgClose(true)
                this.svgOpen(true)
                y = layout.miny
            }
        }
        this.aux.lasty = y
    }

    private emit(text: string): void {
        this.out.push(this.substitute(text))
    }

    private lookup(path: string): unknown {
        const parts = path.split('.')
        let value: unknown = parts[0] == 'aux' ? this.aux
            : parts[0] == 'did' ? this.did
                : Object.hasOwn(this.derived, parts[0]) ? this.derived[parts[0]]
                    : Object.hasOwn(this.vars, parts[0]) ? this.vars[parts[0]] : undefined
        for (const part of parts.slice(1)) {
            if (Array.isArray(value))
                value = /^\d+$/.test(part) ? value[Number(part)] : undefined
            else if (isObject(value))
                value = Object.hasOwn(value, part) ? value[part] : undefined
            else
                return undefined
        }
        return value
    }

    private substitute(text: string): string {
        return text.replace(substitutionPattern, (_m, expr: string) => this.evaluate(expr.trim()))
    }

    private evaluate(expr: string): string {
        const now = dateNowPattern.exec(expr)
        if (now)
            return formatDate(Math.floor(Date.now() / 1000), now[1] ?? now[2])
        if (pathPattern.test(expr))
            return str(this.lookup(expr))
        throw new InvoiceTemplateRenderError(`unsupported expression '${expr}'`)
    }
}

export const substitutionPattern = /\[%([\s\S]*?)%\]/g
export const dateNowPattern = /^date_now\(\s*format\s*=\s*(?:'([^']*)'|"([^"]*)")\s*\)$/
export const pathPattern = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/

/**
 * Renders the template with the given values, returns the svg of all pages
 *
 * @throws InvoiceTemplateRenderError if the template contains unsupported expressions or markers
 */
export function renderInvoiceLayout(template: string, vars: Values, category: InvoiceTemplateCategory): string {
    const {nodes, background} = parseTemplate(template)
    return new Renderer(vars, category, background).run(nodes)
}
