import {checkInvoiceTemplateDirectives} from './invoice-template.helper'
import {convertLegacyInvoiceTemplate, isLegacyInvoiceTemplate} from './invoice-template.legacy'

import {InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

const legacy = `<!--{
    [%
        pagewidth = 210;
        PROCESS "invoice/default/invoice_template_aux.tt";
        money_format(amount=(billprof.interval_charge), comma='.'); fixfee = aux.val;
    -%]
}-->
<svg>
    <!--{ [% MACRO draw_background BLOCK %] }-->
    <g class="page"><text>[% rescontact.company %] Page [% aux.page %]</text></g>
    <!--{ [% END %] }-->
    <g class="page" display="none">
        <!--{ [% draw_background %] }-->
        <!--{ [% zonelist(fontfamily='Verdana', zones=zones.data, fields=[{name='zone',dx=0}]) -%] }-->
        <!--{<g class="list-footer firsty-507 lasty-[% aux.lasty %]">}-->
        <text>[% fixfee %]</text>
        <!--{</g>}-->
        <!--{[% aux.lasty = aux.lasty + 56.7 %]}-->
        <!--{ [% check_pagebreak(following_height=141.75, miny=141.75, maxy=708.75) %] }-->
    </g>
    <!--{ [% FOREACH did IN did_zones %] }-->
    <!--{ [% money_format(amount=(did.totalcost), comma='.'); zonefee = aux.val; %] }-->
    <!--{ [% newpage %] }-->
    <g class="page">
        <!--{ [% zonelist(zones=did.data, fields=[{name='zone',dx=0}]) -%] }-->
        <!--{ [% calllist(calls=calls, fields=[]) -%] }-->
    </g>
    <!--{ [% END %] }-->
</svg>
`

describe('convertLegacyInvoiceTemplate', () => {
    it('does not change current templates', () => {
        const current = '<svg><!--@zones-->[% rescontact.company %]</svg>'
        expect(isLegacyInvoiceTemplate(current)).toBe(false)
        expect(convertLegacyInvoiceTemplate(current)).toBe(current)
    })

    it('converts the constructs of the v1 default templates', () => {
        expect(isLegacyInvoiceTemplate(legacy)).toBe(true)
        const converted = convertLegacyInvoiceTemplate(legacy)
        expect(converted.replace(/\s+/g, ' ')).toEqual(`<svg>
            <!--@define-background-->
            <g class="page"><text>[% rescontact.company %] Page [% aux.page %]</text></g>
            <!--@end-->
            <g class="page" display="none">
                <!--@background-->
                <!--@zones-->
                <g class="list-footer firsty-507 lasty-[% aux.lasty %]">
                <text>[% fixfee %]</text>
                </g>
                <!--@advance-->
                <!--@pagebreak-->
            </g>
            <!--@foreach-did-->
            <!--@newpage-->
            <g class="page">
                <!--@did-zones-->
                <!--@calls-->
            </g>
            <!--@end-->
        </svg> `.replace(/\s+/g, ' '))
        expect(checkInvoiceTemplateDirectives(converted, InvoiceTemplateCategory.Did))
            .toEqual(['marker \'<!--@calls-->\' is not supported by this category'])
    })
})
