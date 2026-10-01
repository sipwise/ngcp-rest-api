import {readFileSync} from 'fs'
import path from 'path'

import {checkInvoiceTemplateDirectives} from './invoice-template.helper'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

const defaultTemplate = (category: InvoiceTemplateCategory): string =>
    readFileSync(path.resolve(__dirname, './defaults', `${category}_invoice_template.svg`), 'utf8')

const check = (template: string, category = InvoiceTemplateCategory.Customer): string[] =>
    checkInvoiceTemplateDirectives(template, category)

describe('InvoiceTemplateValidator', () => {
    it.each(Object.values(InvoiceTemplateCategory))('accepts the default %s template', (category) => {
        expect(check(defaultTemplate(category), category)).toEqual([])
    })

    it('rejects the variables which are not supported', () => {
        expect(check('[% contract.id %][% contact.company %][% zones.totalcost %][% did.totalcost %][% customer.add_vat %][% billprof.fraud_daily_limit %]'))
            .toEqual([
                'unknown variable \'contact\'',
                'unknown variable \'contract\'',
                'unknown variable \'did\'',
                'unknown variable \'zones\'',
                'unknown field \'billprof.fraud_daily_limit\'',
                'unknown field \'customer.add_vat\'',
            ])
    })

    it('rejects did templates for other categories', () => {
        expect(check(defaultTemplate(InvoiceTemplateCategory.Did), InvoiceTemplateCategory.Peer)).toEqual(expect.arrayContaining([
            'marker \'<!--@did-zones-->\' is not supported by this category',
            'marker \'<!--@foreach-did-->\' is not supported by this category',
        ]))
    })

    it('rejects calls for categories other than customer', () => {
        expect(check('<!--@calls-->')).toEqual([])
        expect(check('<!--@calls-->', InvoiceTemplateCategory.Reseller))
            .toEqual(['marker \'<!--@calls-->\' is not supported by this category'])
        expect(check('[% calls.size %]')).toEqual(['unknown variable \'calls\''])
    })

    it('accepts substitutions of variables, derived values and dates', () => {
        expect(check('[% rescontact.company %][% invoice.period_start %][% fixfee %][% aux.page %][% aux.lasty %][%date_now(format=\'%Y-%m-%d\')%]'))
            .toEqual([])
    })

    it('rejects unknown variables and fields', () => {
        expect(check('[% foo %][% rescontact.companyy %][% bar.baz %]'))
            .toEqual(['unknown variable \'bar\'', 'unknown variable \'foo\'', 'unknown field \'rescontact.companyy\''])
    })

    it.each([
        ['[% x = 1 %]', 'unsupported expression \'x = 1\''],
        ['[% money_format(amount=1) %]', 'unsupported expression \'money_format(amount=1)\''],
        ['[% PERL %]x[% END %]', 'unknown variable \'PERL\''],
        ['[% IF x %]', 'unsupported expression \'IF x\''],
        ['[% date_now(format=foo) %]', 'unsupported expression \'date_now(format=foo)\''],
        ['[% rescontact.company', 'unterminated [% directive'],
        ['<!--@zonelist-->', 'unsupported marker \'<!--@zonelist-->\''],
        ['<!--@zones -->', 'unsupported marker syntax'],
        ['<!--@end-->', 'unexpected marker \'<!--@end-->\''],
        ['<!--@foreach-did-->', 'missing marker \'<!--@end-->\''],
    ])('rejects %s', (template, error) => {
        const category = template.includes('foreach-did') ? InvoiceTemplateCategory.Did : InvoiceTemplateCategory.Customer
        expect(check(template, category)).toContain(error)
    })

    it('rejects the TT2 code of old templates', () => {
        expect(check('<!--{ [% MACRO draw_background BLOCK %] }-->')).not.toEqual([])
    })
})
