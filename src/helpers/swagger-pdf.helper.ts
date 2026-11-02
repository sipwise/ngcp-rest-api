import {join} from 'path'

import {OpenAPIObject, OperationObject, ParameterObject, ReferenceObject, RequestBodyObject, ResponseObject, SchemaObject} from '@nestjs/swagger'
import MarkdownIt from 'markdown-it'
import PDFDocument from 'pdfkit'
import SVGtoPDF from 'svg-to-pdfkit'

import {SIPWISE_LOGO_ASPECT, SIPWISE_LOGO_SVG} from '~/helpers/sipwise-logo'
import {GUIDE_TAB_LANGUAGES, fenceInfo} from '~/helpers/swagger-guide.helper'
import {SWAGGER_DEFAULT_LANGUAGE, SwaggerLanguage, formatString, readSwaggerStrings} from '~/helpers/swagger-i18n.helper'
import {Versions} from '~/helpers/swagger-version.helper'

type Token = ReturnType<MarkdownIt['parse']>[number]
type Schema = SchemaObject | ReferenceObject
type Cell = string | {text: string, goTo?: string}

interface Column {
    header: string
    width: number
    mono?: boolean
}

interface Operation {
    method: string
    path: string
    op: OperationObject
    dest: string
}

interface Run {
    text: string
    font: string
    link?: string
}

interface TocEntry {
    text: string
    dest: string
    level: number
    method?: string
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const
const METHOD_COLORS: Record<string, string> = {
    get: '#61affe',
    post: '#49cc90',
    put: '#fca130',
    patch: '#50e3c2',
    delete: '#f93e3e',
}

const BRAND = '#006600'
const TEXT = '#222222'
const MUTED = '#666666'
const LINE = '#d8d8d8'
const FOOTER_VERSIONS = '#9a9a9a'
const HEADER_FILL = '#e8f1e8'
const CODE_FILL = '#f3f4f6'
// the fonts of the swagger page, embedded so the pdf looks the same in every viewer
// - sources, unit and e2e tests: public/fonts
// - webpack bundle: copied to prod/fonts (see webpack.config.js)
const fontLocation = process.env.NODE_WP_BUNDLE
    ? join(__dirname, 'fonts')
    : join(__dirname, '../../public/fonts')
const FONT = 'Arimo'
const BOLD = 'Arimo-Bold'
const MONO = 'JetBrainsMono'
const MONO_BOLD = 'JetBrainsMono-SemiBold'
// Titillium Web as for the title, tabs and tag names on the swagger page
const TITLE = 'TitilliumWeb-Bold'
const HEADING = 'TitilliumWeb-SemiBold'
// ascenders of the size, pdfkit places text by them: Titillium Web's sits lower than Arimo's on the same y
const ASCENDER = {arimo: 0.905, titillium: 1.133}
const FONT_FILES: Record<string, string> = {
    [FONT]: 'arimo-regular.ttf',
    [BOLD]: 'arimo-bold.ttf',
    [MONO]: 'jetbrains-mono-regular.ttf',
    [MONO_BOLD]: 'jetbrains-mono-semibold.ttf',
    [TITLE]: 'titillium-web-bold.ttf',
    [HEADING]: 'titillium-web-semibold.ttf',
}
const MARGINS = {top: 50, bottom: 60, left: 50, right: 50}
// the green title bar on the first page, in the proportions of the swagger page (50px bar, 36px logo), and the space
// below it, about two lines
const LOGO_HEIGHT = 24
const TITLE_BAR_HEIGHT = Math.round(LOGO_HEIGHT * 50 / 36)
const TITLE_BAR_GAP = 28
// the logo and the versions sit close to the ends of the bar as on the swagger page (20px there), not at the margins
const TITLE_BAR_PADDING = 16
const TOC_LINE = {0: 22, 1: 12} as Record<number, number>
const TOC_HEADING_GAP = 2

const isRef = (schema: object): schema is ReferenceObject => '$ref' in schema
const refName = (ref: string): string => ref.split('/').pop()
const schemaDest = (name: string): string => `schema:${name}`
const guideDest = (index: number): string => `guide:${index}`
const markdown = new MarkdownIt()

// index of the token closing the block opened at index
function closingToken(tokens: Token[], index: number): number {
    const type = tokens[index].type.replace(/_open$/, '_close')
    const end = tokens.findIndex((token, i) => i > index && token.type == type && token.level == tokens[index].level)
    return end < 0 ? tokens.length - 1 : end
}

function inlineRuns(token: Token): Run[] {
    const runs: Run[] = []
    let bold = false
    let link: string | undefined
    for (const child of token.children ?? []) {
        if (child.type == 'text')
            runs.push({text: child.content, font: bold ? BOLD : FONT, link})
        else if (child.type == 'code_inline')
            runs.push({text: child.content, font: MONO, link})
        else if (child.type == 'softbreak' || child.type == 'hardbreak')
            runs.push({text: child.type == 'softbreak' ? ' ' : '\n', font: FONT})
        else if (child.type == 'strong_open' || child.type == 'strong_close')
            bold = child.type == 'strong_open'
        else if (child.type == 'link_open')
            link = child.attrGet('href') ?? undefined
        else if (child.type == 'link_close')
            link = undefined
    }
    return runs
}

/**
 * Strips the markdown markup that would otherwise show up as-is in the pdf
 */
export function plainText(text?: string): string {
    return (text ?? '')
        .replace(/```\w*\n?/g, '')
        .replace(/`/g, '')
        .replace(/\*\*/g, '')
        .trim()
}

/**
 * Returns a readable type of the schema, e.g. `AdminResponseDto[]` or `string <date-time>`
 */
export function schemaLabel(schema?: Schema): string {
    if (!schema)
        return ''
    if (isRef(schema))
        return refName(schema.$ref)
    const composite = schema.allOf ?? schema.oneOf ?? schema.anyOf
    if (composite)
        return composite.map(s => schemaLabel(s)).join(schema.allOf ? ' & ' : ' | ')
    if (schema.properties) {
        const props = Object.entries(schema.properties).map(([name, prop]) => `${name}: ${schemaLabel(prop)}`)
        return `{${props.join(', ')}}`
    }
    if (schema.items)
        return `${schemaLabel(schema.items)}[]`
    const type = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? 'any'
    return schema.format ? `${type} <${schema.format}>` : type
}

/**
 * Returns the most specific schema reference, e.g. the data item of a paginated response
 */
export function primaryRef(schema?: Schema): string | undefined {
    if (!schema)
        return undefined
    if (isRef(schema))
        return refName(schema.$ref)
    const nested = [
        ...(schema.allOf ?? schema.oneOf ?? schema.anyOf ?? []),
        ...Object.values(schema.properties ?? {}),
        ...(schema.items ? [schema.items] : []),
    ]
    return nested.map(s => primaryRef(s)).filter(Boolean).pop()
}

function typeLabel(schema: Schema): string {
    if (!isRef(schema) && schema.properties)
        return 'object'
    if (!isRef(schema) && schema.items && !isRef(schema.items) && schema.items.properties)
        return 'object[]'
    return schemaLabel(schema)
}

function schemaDetails(schema: Schema, strings: Record<string, string>): string {
    if (isRef(schema))
        return ''
    const value = (v: unknown): string => typeof v == 'string' ? v : JSON.stringify(v)
    const detail = (key: string, v: unknown): string => formatString(strings[key], {value: value(v)})
    const details = [plainText(schema.description)]
    if (schema.enum)
        details.push(formatString(strings.oneOf, {values: schema.enum.map(value).join(', ')}))
    if (schema.default !== undefined && schema.default !== '')
        details.push(detail('default', schema.default))
    if (schema.minimum !== undefined)
        details.push(detail('minimum', schema.minimum))
    if (schema.maximum !== undefined)
        details.push(detail('maximum', schema.maximum))
    if (schema.minLength !== undefined)
        details.push(detail('minLength', schema.minLength))
    if (schema.maxLength !== undefined)
        details.push(detail('maxLength', schema.maxLength))
    if (schema.pattern)
        details.push(detail('pattern', schema.pattern))
    if (schema.nullable)
        details.push(strings.nullable)
    if (schema.readOnly)
        details.push(strings.readOnly)
    if (schema.example !== undefined && value(schema.example).length <= 80 && !details.some(d => d.includes(value(schema.example))))
        details.push(detail('example', schema.example))
    return details.filter(Boolean).join('\n')
}

class SwaggerPdfRenderer {
    private readonly doc: PDFKit.PDFDocument
    private readonly schemas: Record<string, SchemaObject>
    private readonly destPages = new Map<string, number>()

    private readonly propertyColumns: Column[]

    constructor(
        private readonly api: OpenAPIObject,
        private readonly withGuide: boolean,
        private readonly strings: Record<string, string>,
        private readonly versions: Versions = {},
        private readonly codeLanguage?: string,
    ) {
        this.schemas = (api.components?.schemas ?? {}) as Record<string, SchemaObject>
        this.propertyColumns = [
            {header: strings.property, width: 0.28, mono: true},
            {header: strings.type, width: 0.22, mono: true},
            {header: strings.required, width: 0.1},
            {header: strings.description, width: 0.4},
        ]
        this.doc = new PDFDocument({
            size: 'A4',
            margins: MARGINS,
            bufferPages: true,
            info: {Title: api.info.title, Subject: formatString(strings.subject, {version: api.info.version}), Author: 'Sipwise'},
        })
        for (const [name, file] of Object.entries(FONT_FILES))
            this.doc.registerFont(name, join(fontLocation, file))
        this.doc.font(FONT)
    }

    async render(): Promise<Buffer> {
        const chunks: Buffer[] = []
        const done = new Promise<Buffer>((resolve, reject) => {
            this.doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            this.doc.on('end', () => resolve(Buffer.concat(chunks)))
            this.doc.on('error', reject)
        })

        const groups = this.groupOperations()
        const schemaNames = Object.keys(this.schemas).sort((a, b) => a.localeCompare(b))
        const guide = this.withGuide
            ? markdown.parse(this.api.info.description ?? '', {}).filter(token => this.keepCode(token))
            : []
        const toc: TocEntry[] = [
            ...guide.flatMap((token, i) => token.type == 'heading_open' && (token.tag == 'h2' || token.tag == 'h3')
                ? [{text: guide[i + 1].content, dest: guideDest(i), level: token.tag == 'h2' ? 0 : 1}]
                : []),
            ...[...groups].flatMap(([tag, ops]) => [
                {text: tag, dest: `tag:${tag}`, level: 0},
                ...ops.map(o => ({text: o.path, dest: o.dest, level: 1, method: o.method})),
            ]),
            ...(schemaNames.length ? [{text: this.strings.schemas, dest: 'schemas', level: 0}] : []),
            ...schemaNames.map(name => ({text: name, dest: schemaDest(name), level: 1})),
        ]

        // the contents start on the first page, below the title bar
        this.titleBar()
        const tocStart = this.currentPage()
        const tocLayout = this.layoutToc(toc)
        const tocPages = tocLayout.length ? tocLayout[tocLayout.length - 1].page + 1 : 0
        if (tocPages)
            this.doc.outline.addItem(this.strings.contents)
        for (let page = 1; page < tocPages; page++)
            this.doc.addPage()

        this.renderGuide(guide)
        for (const [i, [tag, ops]] of [...groups].entries())
            this.renderTag(tag, ops, !i)
        if (schemaNames.length)
            this.renderSchemas(schemaNames)

        if (tocPages)
            this.renderToc(toc, tocLayout, tocStart)
        this.renderFooters()
        this.doc.end()
        return done
    }

    private get contentWidth(): number {
        return this.doc.page.width - MARGINS.left - MARGINS.right
    }

    private get bottom(): number {
        return this.doc.page.height - MARGINS.bottom
    }

    private currentPage(): number {
        const range = this.doc.bufferedPageRange()
        return range.start + range.count - 1
    }

    private ensureSpace(height: number): void {
        if (this.doc.y + height > this.bottom)
            this.doc.addPage()
    }

    private markDest(dest: string): void {
        this.destPages.set(dest, this.currentPage())
    }

    private para(text: string, font: string, size: number, color: string, options: PDFKit.Mixins.TextOptions = {}): void {
        if (!text)
            return
        this.doc.font(font).fontSize(size).fillColor(color)
            .text(text, MARGINS.left, this.doc.y, {width: this.contentWidth, ...options})
    }

    private groupOperations(): Map<string, Operation[]> {
        const groups = new Map<string, Operation[]>()
        for (const tag of this.api.tags ?? [])
            groups.set(tag.name, [])
        for (const [path, item] of Object.entries(this.api.paths)) {
            for (const method of METHODS) {
                const op = item[method]
                if (!op)
                    continue
                const tag = op.tags?.[0] ?? 'default'
                if (!groups.has(tag))
                    groups.set(tag, [])
                groups.get(tag).push({method, path, op, dest: `op:${method}:${path}`})
            }
        }
        return new Map([...groups]
            .filter(([, ops]) => ops.length)
            .sort(([a], [b]) => a.localeCompare(b)))
    }

    // the title bar of the swagger page: white logo on the left, title centered next to it, the versions on the right
    private titleBar(): void {
        const doc = this.doc
        const logoWidth = LOGO_HEIGHT * SIPWISE_LOGO_ASPECT
        doc.rect(0, 0, doc.page.width, TITLE_BAR_HEIGHT).fill(BRAND)
        SVGtoPDF(doc, SIPWISE_LOGO_SVG.replace('<svg ', '<svg fill="#fff" '), TITLE_BAR_PADDING, (TITLE_BAR_HEIGHT - LOGO_HEIGHT) / 2,
            {width: logoWidth, height: LOGO_HEIGHT})
        // relative to the logo as on the swagger page (22px title, 36px logo)
        const size = Math.round(LOGO_HEIGHT * 22 / 36)
        const title = this.api.info.title.toUpperCase()
        doc.font(TITLE).fontSize(size)
        const titleWidth = doc.widthOfString(title)
        const titleX = Math.max((doc.page.width - titleWidth) / 2, TITLE_BAR_PADDING + logoWidth + 16)
        // centered on the capitals, cap height 0.68 of the size
        doc.fillColor('#ffffff').text(title, titleX, TITLE_BAR_HEIGHT / 2 - (ASCENDER.titillium - 0.68 / 2) * size, {lineBreak: false})
        this.titleBarVersions(titleX + titleWidth + 16)
        doc.x = MARGINS.left
        doc.y = TITLE_BAR_HEIGHT + TITLE_BAR_GAP
    }

    // "NGCP trunk" and the package version, right aligned between the title and the right margin as on the swagger
    // page (11px there); a long trunk version gets smaller, down to a minimum, then shortened in the middle, so the
    // release and the commit stay; the footer has it all
    private titleBarVersions(left: number): void {
        const doc = this.doc
        const right = doc.page.width - TITLE_BAR_PADDING
        const lines = [
            ...(this.versions.ngcp ? [[{text: 'NGCP ', font: FONT}, {text: this.versions.ngcp, font: BOLD}]] : []),
            ...(this.versions.api ? [[{text: this.versions.api, font: BOLD}]] : []),
        ]
        if (!lines.length)
            return
        const widthOf = (line: {text: string, font: string}[], size: number): number =>
            line.reduce((sum, part) => sum + doc.font(part.font).fontSize(size).widthOfString(part.text), 0)
        const room = right - left
        const size = Math.max(5.5, Math.min(7.5, ...lines.map(line => 7.5 * room / widthOf(line, 7.5))))
        const lineHeight = size * 1.3
        let y = TITLE_BAR_HEIGHT / 2 - lines.length * lineHeight / 2 + (lineHeight - size) / 2
        for (const line of lines) {
            const last = line[line.length - 1]
            if (widthOf(line, size) > room)
                last.text = this.fitMiddle(last.text, room - widthOf(line.slice(0, -1), size), last.font, size)
            let x = right - widthOf(line, size)
            for (const part of line) {
                doc.font(part.font).fontSize(size).fillColor('#ffffff').text(part.text, x, y, {lineBreak: false})
                x += doc.widthOfString(part.text)
            }
            y += lineHeight
        }
    }

    private writeRuns(runs: Run[], x: number, width: number, size = 10): void {
        runs.forEach((run, i) => {
            const options = {width, continued: i < runs.length - 1, link: run.link ?? null}
            this.doc.font(run.font).fontSize(run.font == MONO ? size - 0.5 : size).fillColor(run.link ? BRAND : TEXT)
            if (i)
                this.doc.text(run.text, options)
            else
                this.doc.text(run.text, x, this.doc.y, options)
        })
        this.doc.x = MARGINS.left
    }

    private renderGuide(tokens: Token[]): void {
        const doc = this.doc
        let outline: PDFKit.PDFOutline | undefined
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]
            if (token.type == 'heading_open') {
                const title = tokens[i + 1].content
                if (token.tag == 'h2') {
                    this.sectionHeading(title, guideDest(i), true)
                    outline = doc.outline.addItem(title)
                } else {
                    doc.moveDown(token.tag == 'h3' ? 1 : 0.6)
                    this.ensureSpace(80)
                    this.markDest(guideDest(i))
                    if (token.tag == 'h3')
                        outline?.addItem(title)
                    this.para(title, BOLD, token.tag == 'h3' ? 13 : 11, TEXT, {destination: guideDest(i)})
                    doc.moveDown(0.3)
                }
                i += 2
            } else if (token.type == 'paragraph_open') {
                this.writeRuns(inlineRuns(tokens[i + 1]), MARGINS.left, this.contentWidth)
                doc.moveDown(0.6)
                i += 2
            } else if (token.type == 'bullet_list_open' || token.type == 'ordered_list_open') {
                const end = closingToken(tokens, i)
                let n = 0
                for (let j = i; j < end; j++) {
                    if (tokens[j].type != 'inline')
                        continue
                    this.ensureSpace(20)
                    const y = doc.y
                    doc.font(FONT).fontSize(10).fillColor(TEXT)
                        .text(token.type == 'ordered_list_open' ? `${++n}.` : '\u2022', MARGINS.left + 4, y)
                    doc.y = y
                    this.writeRuns(inlineRuns(tokens[j]), MARGINS.left + 18, this.contentWidth - 18)
                    doc.moveDown(0.3)
                }
                doc.moveDown(0.3)
                i = end
            } else if (token.type == 'table_open') {
                const end = closingToken(tokens, i)
                const rows: string[][] = []
                for (let j = i; j < end; j++) {
                    if (tokens[j].type == 'tr_open')
                        rows.push([])
                    else if (tokens[j].type == 'inline')
                        rows[rows.length - 1].push(inlineRuns(tokens[j]).map(run => run.text).join(''))
                }
                const [header, ...body] = rows
                const lengths = header.map((_, c) => Math.max(8, ...rows.map(row => Math.min(row[c]?.length ?? 0, 60))))
                const total = lengths.reduce((sum, length) => sum + length, 0)
                this.table(header.map((text, c) => ({header: text, width: lengths[c] / total})), body)
                doc.moveDown(0.6)
                i = end
            } else if (token.type == 'fence') {
                // tabs of the swagger page become labelled blocks, e.g. "Python \u00b7 Basic Auth" or "return=id"
                const {lang, label} = fenceInfo(token.info)
                const tab = [GUIDE_TAB_LANGUAGES[lang], label].filter(Boolean).join(' \u00b7 ')
                this.codeBlock(token.content, tab || undefined)
            }
        }
    }

    // with a code language, the language tabs of the usage examples are reduced to it
    private keepCode(token: Token): boolean {
        if (token.type != 'fence' || !this.codeLanguage)
            return true
        const {lang} = fenceInfo(token.info)
        return !(lang in GUIDE_TAB_LANGUAGES) || lang == this.codeLanguage
    }

    // code on a shaded box, split at line boundaries across pages
    private codeBlock(code: string, label?: string): void {
        const doc = this.doc
        const pad = 6
        const size = 7.5
        const width = this.contentWidth - 2 * pad
        const lines = code.replace(/\n$/, '').replace(/\t/g, '    ').split('\n')
        doc.font(MONO).fontSize(size)
        const heights = lines.map(line => doc.heightOfString(line || ' ', {width}))
        if (label) {
            this.ensureSpace(heights.slice(0, 3).reduce((sum, h) => sum + h, 0) + 2 * pad + 16)
            this.para(label, BOLD, 8.5, MUTED)
            doc.moveDown(0.2)
        }
        for (let i = 0; i < lines.length;) {
            if (doc.y + heights[i] + 2 * pad > this.bottom)
                doc.addPage()
            const top = doc.y
            let end = i
            let height = 0
            while (end < lines.length && top + height + heights[end] + 2 * pad <= this.bottom)
                height += heights[end++]
            doc.rect(MARGINS.left, top, this.contentWidth, height + 2 * pad).fill(CODE_FILL)
            doc.font(MONO).fontSize(size).fillColor(TEXT)
            let y = top + pad
            for (; i < end; i++) {
                doc.text(lines[i] || ' ', MARGINS.left + pad, y, {width})
                y += heights[i]
            }
            doc.x = MARGINS.left
            doc.y = top + height + 2 * pad
        }
        doc.moveDown(0.8)
    }

    private layoutToc(toc: TocEntry[]): {page: number, y: number}[] {
        let page = 0
        let y = TITLE_BAR_HEIGHT + TITLE_BAR_GAP + 40
        return toc.map(entry => {
            const height = TOC_LINE[entry.level]
            if (y + height > this.bottom) {
                page++
                y = MARGINS.top
            }
            const pos = {page, y: y + (entry.level ? 0 : height - TOC_LINE[1] - TOC_HEADING_GAP)}
            y += height
            return pos
        })
    }

    private renderToc(toc: TocEntry[], layout: {page: number, y: number}[], tocStart: number): void {
        const doc = this.doc
        const numberWidth = 40
        doc.switchToPage(tocStart)
        doc.font(HEADING).fontSize(18).fillColor(BRAND).text(this.strings.contents, MARGINS.left, TITLE_BAR_HEIGHT + TITLE_BAR_GAP)
        toc.forEach((entry, i) => {
            const {page, y} = layout[i]
            doc.switchToPage(tocStart + page)
            const pageNumber = String((this.destPages.get(entry.dest) ?? 0) + 1)
            let x = MARGINS.left
            if (entry.level) {
                x += 12
                if (entry.method) {
                    doc.font(MONO_BOLD).fontSize(8).fillColor(METHOD_COLORS[entry.method] ?? MUTED)
                        .text(entry.method.toUpperCase(), x, y, {lineBreak: false})
                    x += 42
                }
            }
            const width = MARGINS.left + this.contentWidth - numberWidth - x
            const size = entry.level ? 8.5 : 11
            doc.font(entry.level ? (entry.method ? MONO : FONT) : HEADING)
                .fontSize(size)
                .fillColor(entry.level ? TEXT : BRAND)
                .text(this.fit(entry.text, width), x, entry.level ? y : y - (ASCENDER.titillium - ASCENDER.arimo) * size,
                    {lineBreak: false, goTo: entry.dest})
            doc.font(FONT).fillColor(MUTED)
                .text(pageNumber, MARGINS.left + this.contentWidth - numberWidth, y, {width: numberWidth, align: 'right', lineBreak: false})
        })
    }

    private fitMiddle(text: string, width: number, font: string, size: number): string {
        this.doc.font(font).fontSize(size)
        let keep = text.length
        while (keep > 2 && this.doc.widthOfString(text.slice(0, Math.ceil(keep / 2)) + '…' + text.slice(-Math.floor(keep / 2))) > width)
            keep--
        return keep == text.length ? text : text.slice(0, Math.ceil(keep / 2)) + '…' + text.slice(-Math.floor(keep / 2))
    }

    private fit(text: string, width: number): string {
        if (this.doc.widthOfString(text) <= width)
            return text
        let fitted = text
        while (fitted && this.doc.widthOfString(fitted + '...') > width)
            fitted = fitted.slice(0, -1)
        return fitted + '...'
    }

    private sectionHeading(text: string, dest: string, newPage: boolean): void {
        const doc = this.doc
        if (newPage || doc.y + 250 > this.bottom)
            doc.addPage()
        else
            doc.moveDown(3)
        this.markDest(dest)
        doc.font(HEADING).fontSize(18).fillColor(BRAND)
            .text(text, MARGINS.left, doc.y, {width: this.contentWidth, destination: dest})
        const y = doc.y + 2
        doc.moveTo(MARGINS.left, y).lineTo(MARGINS.left + this.contentWidth, y).lineWidth(1).strokeColor(BRAND).stroke()
        doc.y = y + 8
    }

    private subHeading(text: string): void {
        this.ensureSpace(70)
        this.doc.moveDown(0.4)
        this.para(text, BOLD, 9.5, MUTED)
        this.doc.moveDown(0.2)
    }

    private renderTag(tag: string, ops: Operation[], newPage: boolean): void {
        this.sectionHeading(tag, `tag:${tag}`, newPage)
        const outline = this.doc.outline.addItem(tag)
        const description = this.api.tags?.find(t => t.name == tag)?.description
        this.para(plainText(description), FONT, 10, MUTED)
        for (const op of ops)
            this.renderOperation(op, outline)
    }

    private renderOperation({method, path, op, dest}: Operation, outline: PDFKit.PDFOutline): void {
        const doc = this.doc
        doc.moveDown(1.2)
        this.ensureSpace(90)
        this.markDest(dest)
        outline.addItem(`${method.toUpperCase()} ${path}`)

        const y = doc.y
        const badge = 52
        doc.roundedRect(MARGINS.left, y, badge, 16, 3).fill(METHOD_COLORS[method] ?? MUTED)
        doc.font(BOLD).fontSize(9).fillColor('#ffffff')
            .text(method.toUpperCase(), MARGINS.left, y + 4, {width: badge, align: 'center', destination: dest})
        doc.font(MONO_BOLD).fontSize(10).fillColor(TEXT)
            .text(path, MARGINS.left + badge + 8, y + 3, {width: this.contentWidth - badge - 8})
        doc.y = Math.max(doc.y, y + 16) + 6

        this.para(op.summary, BOLD, 10, TEXT)
        this.para(plainText(op.description), FONT, 9, TEXT)
        if (op.deprecated)
            this.para(this.strings.deprecated, BOLD, 9, METHOD_COLORS.delete)
        if (op.security && !op.security.length)
            this.para(this.strings.noAuth, FONT, 9, MUTED)

        const params = (op.parameters ?? []).filter((p): p is ParameterObject => !isRef(p))
        if (params.length) {
            this.subHeading(this.strings.parameters)
            this.table([
                {header: this.strings.name, width: 0.28, mono: true},
                {header: this.strings.in, width: 0.08},
                {header: this.strings.type, width: 0.17, mono: true},
                {header: this.strings.required, width: 0.1},
                {header: this.strings.description, width: 0.37},
            ], params.map(p => [
                p.name,
                p.in,
                p.schema ? typeLabel(p.schema) : '',
                p.required ? this.strings.yes : this.strings.no,
                [plainText(p.description), p.schema ? schemaDetails(p.schema, this.strings) : ''].filter(Boolean).join('\n'),
            ]))
        }

        const body = op.requestBody && !isRef(op.requestBody) ? op.requestBody as RequestBodyObject : undefined
        if (body?.content) {
            this.subHeading(body.required ? this.strings.requestBodyRequired : this.strings.requestBody)
            this.para(plainText(body.description), FONT, 9, TEXT)
            this.table([
                {header: this.strings.contentType, width: 0.3, mono: true},
                {header: this.strings.schema, width: 0.7, mono: true},
            ], Object.entries(body.content).map(([type, media]) => [
                type,
                {text: schemaLabel(media.schema), goTo: this.schemaLink(media.schema)},
            ]))
            for (const [type, media] of Object.entries(body.content)) {
                if (!media.schema || isRef(media.schema) || !media.schema.properties)
                    continue
                this.subHeading(type)
                this.table(this.propertyColumns, this.propertyRows(media.schema))
            }
        }

        const responses = Object.entries(op.responses ?? {})
        if (responses.length) {
            this.subHeading(this.strings.responses)
            this.table([
                {header: this.strings.code, width: 0.1, mono: true},
                {header: this.strings.description, width: 0.3},
                {header: this.strings.schema, width: 0.6, mono: true},
            ], responses.map(([code, response]) => {
                const content = isRef(response) ? {} : (response as ResponseObject).content ?? {}
                const schemas = Object.entries(content)
                    .map(([type, media]) => media.schema ? `${type}: ${schemaLabel(media.schema)}` : type)
                    .join('\n')
                const goTo = Object.values(content).map(media => this.schemaLink(media.schema)).find(Boolean)
                return [
                    code,
                    isRef(response) ? refName(response.$ref) : plainText(response.description),
                    {text: schemas, goTo},
                ]
            }))
        }
    }

    private schemaLink(schema?: Schema): string | undefined {
        const ref = primaryRef(schema)
        return ref && this.schemas[ref] ? schemaDest(ref) : undefined
    }

    private renderSchemas(names: string[]): void {
        this.sectionHeading(this.strings.schemas, 'schemas', true)
        const outline = this.doc.outline.addItem(this.strings.schemas)
        names.forEach((name, i) => {
            const schema = this.schemas[name]
            const dest = schemaDest(name)
            if (i)
                this.doc.moveDown(1.2)
            this.ensureSpace(60)
            this.markDest(dest)
            outline.addItem(name)
            this.para(name, BOLD, 11, TEXT, {destination: dest})
            this.doc.moveDown(0.2)
            this.para(plainText(schema.description), FONT, 9, MUTED)

            const parts = schema.allOf ?? [schema]
            const parents = parts.filter(isRef).map(p => refName(p.$ref))
            if (parents.length)
                this.para(formatString(this.strings.extends, {parents: parents.join(', ')}), FONT, 9, MUTED)
            const rows = parts.filter((p): p is SchemaObject => !isRef(p)).flatMap(p => this.propertyRows(p))
            if (rows.length) {
                this.doc.moveDown(0.3)
                this.table(this.propertyColumns, rows)
            } else if (!parents.length) {
                this.para(formatString(this.strings.typeOf, {type: schemaLabel(schema)}), FONT, 9, TEXT)
                this.para(schemaDetails({...schema, description: undefined}, this.strings), FONT, 9, MUTED)
            }
        })
    }

    private propertyRows(schema: SchemaObject, prefix = ''): Cell[][] {
        return Object.entries(schema.properties ?? {}).flatMap(([name, prop]) => {
            const rows: Cell[][] = [[
                prefix + name,
                {text: typeLabel(prop), goTo: this.schemaLink(prop)},
                schema.required?.includes(name) ? this.strings.yes : this.strings.no,
                schemaDetails(prop, this.strings),
            ]]
            if (!isRef(prop) && prop.properties)
                rows.push(...this.propertyRows(prop, `${prefix}${name}.`))
            else if (!isRef(prop) && prop.items && !isRef(prop.items) && prop.items.properties)
                rows.push(...this.propertyRows(prop.items, `${prefix}${name}[].`))
            return rows
        })
    }

    private table(columns: Column[], rows: Cell[][]): void {
        const doc = this.doc
        const pad = 4
        const size = 8.5
        const widths = columns.map(c => c.width * this.contentWidth)
        const cellFont = (i: number, header: boolean): string => header ? BOLD : columns[i].mono ? MONO : FONT

        const drawRow = (cells: Cell[], header: boolean): void => {
            const texts = cells.map(c => typeof c == 'string' ? c : c.text)
            const height = Math.max(...texts.map((text, i) =>
                doc.font(cellFont(i, header)).fontSize(size).heightOfString(text || ' ', {width: widths[i] - 2 * pad}),
            )) + 2 * pad
            if (doc.y + height > this.bottom) {
                doc.addPage()
                if (!header)
                    drawRow(columns.map(c => c.header), true)
            }
            const y = doc.y
            if (header)
                doc.rect(MARGINS.left, y, this.contentWidth, height).fill(HEADER_FILL)
            let x = MARGINS.left
            cells.forEach((cell, i) => {
                const goTo = typeof cell == 'string' ? undefined : cell.goTo
                doc.font(cellFont(i, header)).fontSize(size).fillColor(goTo ? BRAND : TEXT)
                    .text(texts[i], x + pad, y + pad, {width: widths[i] - 2 * pad, goTo})
                x += widths[i]
            })
            doc.moveTo(MARGINS.left, y + height).lineTo(MARGINS.left + this.contentWidth, y + height)
                .lineWidth(0.5).strokeColor(LINE).stroke()
            doc.x = MARGINS.left
            doc.y = y + height
        }

        if (doc.y + 40 > this.bottom)
            doc.addPage()
        drawRow(columns.map(c => c.header), true)
        rows.forEach(row => drawRow(row, false))
    }

    private renderFooters(): void {
        const doc = this.doc
        const {start, count} = doc.bufferedPageRange()
        // the title, then the versions in a lighter grey: "NGCP API Documentation 2.1 · NGCP trunk · mr27.0.0.0"
        const versions = [this.versions.ngcp && `NGCP ${this.versions.ngcp}`, this.versions.api].filter(Boolean)
        const title = `${this.api.info.title} ${this.api.info.version}`
        for (let i = start; i < start + count; i++) {
            doc.switchToPage(i)
            doc.page.margins.bottom = 0
            const y = doc.page.height - 40
            doc.moveTo(MARGINS.left, y - 6).lineTo(MARGINS.left + this.contentWidth, y - 6)
                .lineWidth(0.5).strokeColor(LINE).stroke()
            const page = formatString(this.strings.page, {page: i + 1, pages: count})
            doc.font(FONT).fontSize(8).fillColor(MUTED)
                .text(page, MARGINS.left, y, {width: this.contentWidth, align: 'right', lineBreak: false})
            const room = this.contentWidth - doc.widthOfString(page) - 24
            doc.text(title, MARGINS.left, y, {lineBreak: false})
            if (versions.length) {
                const x = MARGINS.left + doc.widthOfString(title)
                doc.fillColor(FOOTER_VERSIONS)
                    .text(this.fit(` · ${versions.join(' · ')}`, room - doc.widthOfString(title)), x, y, {lineBreak: false})
            }
        }
    }
}

/**
 * Renders the OpenAPI document as a print friendly pdf: contents, the guide of the description (unless
 * apiOnly is set), endpoints grouped by tag and the schemas, with bookmarks and links between them; the
 * fixed texts are the pdf strings of the language. usage 'curl' keeps only the curl examples of the guide
 */
export async function renderSwaggerPdf(
    document: OpenAPIObject,
    {apiOnly = false, lang = SWAGGER_DEFAULT_LANGUAGE, usage, versions = {}}: {
        apiOnly?: boolean, lang?: SwaggerLanguage, usage?: 'curl', versions?: Versions,
    } = {},
): Promise<Buffer> {
    const codeLanguage = usage == 'curl' ? 'shell' : undefined
    return new SwaggerPdfRenderer(document, !apiOnly, readSwaggerStrings(lang).pdf, versions, codeLanguage).render()
}
