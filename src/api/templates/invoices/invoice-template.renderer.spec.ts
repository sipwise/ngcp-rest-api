import {readFileSync} from 'fs'
import path from 'path'

import {formatDate} from './invoice-format'
import {getDerivedVariables, moneyFormat, timestamp2time} from './invoice-layout'
import {
    InvoiceTemplateRenderError,
    preprocessSvg,
    preprocessSvgPages,
    renderInvoiceTemplate,
    svgToPdf,
    toTemplateVars,
} from './invoice-template.renderer'
import {getInvoiceTemplateVars} from './invoice-template.vars'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

const defaultTemplate = (category: InvoiceTemplateCategory): string =>
    readFileSync(path.resolve(__dirname, './defaults', `${category}_invoice_template.svg`), 'utf8')

const render = (template: string, category = InvoiceTemplateCategory.Customer): string =>
    renderInvoiceTemplate(template, toTemplateVars(getInvoiceTemplateVars(category)), category)

describe('InvoiceTemplateRenderer', () => {
    describe('helpers', () => {
        it('formats money in cents', () => {
            expect(moneyFormat(12345)).toEqual('123.45')
            expect(moneyFormat(-12345)).toEqual('-123.45')
            expect(moneyFormat(-7, 3)).toEqual('-0.070')
            expect(moneyFormat(1234567, 4)).toEqual('12345.6700')
            expect(moneyFormat(99.5, 3)).toEqual('0.995')
            expect(moneyFormat(undefined)).toEqual('0.00')
        })

        it('formats seconds', () => {
            expect(timestamp2time(3725)).toEqual('01:02:05')
            expect(timestamp2time(0)).toEqual('00:00:00')
        })

        it('removes the display attribute of pages', () => {
            expect(preprocessSvg('<g class="page" display="none"><g class="other" display="none">'))
                .toEqual('<g class="page"><g class="other" display="none">')
        })
    })

    describe('renderInvoiceTemplate', () => {
        it.each(Object.values(InvoiceTemplateCategory))('renders the default %s template', (category) => {
            const svg = render(defaultTemplate(category), category)
            expect(svg).not.toMatch(/\[%|%\]|<!--@/)
            expect(svg).toContain('Resellercompany')
            expect(svg.match(/<svg/g)?.length).toBeGreaterThanOrEqual(category == InvoiceTemplateCategory.Customer ? 2 : 1)
            expect(svg.match(/<svg/g)?.length).toEqual(svg.match(/<\/svg>/g)?.length)
        })

        it('substitutes values', () => {
            const svg = render('<svg>[% rescontact.company %] [% fixfee %] [% p_start %] [% invoice.serial %] [% nope.x %]|[% date_now(format=\'%Y\') %]</svg>')
            expect(svg).toMatch(/^<svg>Resellercompany Inc\. 29\.90 2026-09-01 INV2026090000001 \|\d{4}<\/svg>$/)
        })

        it('escapes xml special characters of the values', () => {
            const vars = getInvoiceTemplateVars(InvoiceTemplateCategory.Customer)
            vars.rescontact!.company = 'A & <B>'
            expect(renderInvoiceTemplate('<svg>[% rescontact.company %]</svg>', toTemplateVars(vars), InvoiceTemplateCategory.Customer))
                .toEqual('<svg>A &amp; &lt;B&gt;</svg>')
        })

        it('does not read prototype properties', () => {
            expect(render('<svg>[% rescontact.constructor %][% constructor %][% rescontact.__proto__ %]</svg>')).toEqual('<svg></svg>')
        })

        it('breaks lists into pages', () => {
            const vars = getInvoiceTemplateVars(InvoiceTemplateCategory.Customer)
            vars.calls = Array.from({length: 150}, () => ({...vars.calls![0]}))
            const svg = renderInvoiceTemplate(defaultTemplate(InvoiceTemplateCategory.Customer), toTemplateVars(vars), InvoiceTemplateCategory.Customer)
            expect(svg.match(/<svg/g)!.length).toBeGreaterThan(4)
            expect(svg.match(/<svg/g)!.length).toEqual(svg.match(/<\/svg>/g)!.length)
            expect(svg).toContain('Page 6')
        })

        it('renders the did zones on their own page', () => {
            const svg = render(defaultTemplate(InvoiceTemplateCategory.Did), InvoiceTemplateCategory.Did)
            expect(svg).toContain('Zone 1')
            expect(svg.match(/<svg/g)!.length).toEqual(svg.match(/<\/svg>/g)!.length)
        })

        it.each([
            ['[% 1 + 1 %]', /unsupported expression/],
            ['<!--@nothing-->', /unknown marker/],
            ['<!--@foreach-did-->', /missing <!--@end--> marker/],
            ['<!--@end-->', /unexpected marker/],
        ])('reports template errors of %s', (template, error) => {
            expect(() => render(template)).toThrow(InvoiceTemplateRenderError)
            expect(() => render(template)).toThrow(error)
        })
    })

    describe('preprocessSvgPages', () => {
        it('splits pages and moves the list footer below the list', () => {
            const svg = '<svg server-process-units="none"><g class="list-footer firsty-500 lasty-300.5"><text y="510"/><g><line y1="520" y2="530.5"/></g></g></svg>'
                + '<svg server-process-units="mm"><g class="list-footer firsty-100 lasty-50"><text y="110"/></g></svg>'
            expect(preprocessSvgPages(svg)).toEqual([
                '<svg server-process-units="none"><g class="list-footer firsty-500 lasty-300.5"><text y="310"/><g><line y1="320" y2="330.5"/></g></g></svg>',
                '<svg server-process-units="mm"><g class="list-footer firsty-100 lasty-50"><text y="60mm"/></g></svg>',
            ])
        })
    })

    describe('dates', () => {
        it('formats the weekday names', () => {
            // 2026-09-27 is a Sunday, 2026-09-28 a Monday
            expect(formatDate(Date.UTC(2026, 8, 27) / 1000, '%A %a %w %u', true)).toEqual('Sunday Sun 0 7')
            expect(formatDate(Date.UTC(2026, 8, 28) / 1000, '%A %a %w %u', true)).toEqual('Monday Mon 1 1')
            expect(formatDate(Date.UTC(2026, 9, 3) / 1000, '%A', true)).toEqual('Saturday')
        })
    })

    describe('derived variables', () => {
        it('returns the derived values of the invoice variables', () => {
            const vars = toTemplateVars(getInvoiceTemplateVars(InvoiceTemplateCategory.Customer))
            expect(getDerivedVariables(vars)).toEqual({
                fixfee: expect.stringMatching(/^\d+\.\d{2}$/),
                zonefee: expect.stringMatching(/^\d+\.\d{2}$/),
                netfee: '60.00',
                vatfee: expect.stringMatching(/^\d+\.\d{2}$/),
                allfee: expect.stringMatching(/^\d+\.\d{2}$/),
                cur: expect.any(String),
                p_start: '2026-09-01',
                p_end: '2026-09-30',
            })
        })
    })

    describe('known variables', () => {
        it('provides the variables used by the v1 templates', () => {
            const vars = getInvoiceTemplateVars(InvoiceTemplateCategory.Customer) as unknown as Record<string, Record<string, unknown>>
            const contact = ['bankname', 'bic', 'city', 'company', 'comregnum', 'country', 'faxnumber', 'firstname', 'gender',
                ...[...Array(10).keys()].map(i => `gpp${i}`), 'iban', 'lastname', 'mobilenumber', 'phonenumber', 'postcode', 'street', 'vatnum']
            const expected: Record<string, string[]> = {
                rescontact: contact,
                custcontact: contact,
                customer: ['external_id', 'id', 'vat_rate'],
                billprof: ['currency', 'handle', 'interval_charge', 'interval_count', 'interval_free_cash', 'interval_free_time', 'interval_unit', 'name', 'prepaid'],
                invoice: ['amount_net', 'amount_total', 'amount_vat', 'period_end', 'period_start', 'serial'],
            }
            for (const [name, fields] of Object.entries(expected)) {
                for (const field of fields)
                    expect(Object.keys(vars[name])).toContain(field)
            }
        })
    })

    describe('svgToPdf', () => {
        it('converts the default templates to a multi page pdf', async () => {
            const vars = getInvoiceTemplateVars(InvoiceTemplateCategory.Customer)
            vars.calls = Array.from({length: 100}, () => ({...vars.calls![0]}))
            const svg = renderInvoiceTemplate(defaultTemplate(InvoiceTemplateCategory.Customer), toTemplateVars(vars), InvoiceTemplateCategory.Customer)
            const pdf = await svgToPdf(svg)
            expect(pdf.subarray(0, 5).toString('latin1')).toEqual('%PDF-')
            expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)!.length).toBeGreaterThan(3)
        }, 60000)
    })
})
