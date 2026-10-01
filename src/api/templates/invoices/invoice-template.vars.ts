import {
    InvoiceTemplateBillingProfileVars,
    InvoiceTemplateCallVars,
    InvoiceTemplateContactVars,
    InvoiceTemplateCustomerVars,
    InvoiceTemplateDidZoneVars,
    InvoiceTemplateInvoiceVars,
    InvoiceTemplateZoneVars,
    InvoiceTemplateZonesVars,
} from './dto/invoice-vars.dto'

import {RbacRole} from '~/config/constants.config'
import {InvoiceTemplateCallDirection, InvoiceTemplateCategory} from '~/entities/internal/invoice-template.internal.entity'

/**
 * Names of the variables available as substitutions
 */
export const substitutionVariables = ['rescontact', 'customer', 'custcontact', 'billprof', 'invoice'] as const

/**
 * Variables available as substitutions
 */
export interface InvoiceTemplateSubstitutionVars {
    rescontact: InvoiceTemplateContactVars
    customer: InvoiceTemplateCustomerVars
    custcontact: InvoiceTemplateContactVars
    billprof: InvoiceTemplateBillingProfileVars
    invoice: InvoiceTemplateInvoiceVars
}

/**
 * Variables of the renderer: the substitutions and the lists consumed by the layout markers
 */
export interface InvoiceTemplateVars extends InvoiceTemplateSubstitutionVars {
    zones: InvoiceTemplateZonesVars
    calls?: InvoiceTemplateCallVars[]
    did_zones?: InvoiceTemplateDidZoneVars[]
}

const callDirectionLabel: Record<InvoiceTemplateCallDirection, string> = {
    [InvoiceTemplateCallDirection.In]: 'from',
    [InvoiceTemplateCallDirection.Out]: 'to',
    [InvoiceTemplateCallDirection.InOut]: 'from/to',
}

function customerContact(): InvoiceTemplateContactVars {
    return new InvoiceTemplateContactVars({
        id: 2,
        firstname: 'Customerfirst',
        lastname: 'Customerlast',
        company: 'Customercompany Inc.',
        street: 'Customerstreet 12/3',
        phonenumber: '+4234567890',
        mobilenumber: '+5234567890',
        faxnumber: '+6234567890',
        email: 'customer@example.org',
        iban: 'CUSTIBAN1234567890',
        bic: 'CUSTBIC1234567890',
        vatnum: 'CUSTVAT1234567890',
        bankname: 'Customerbank',
        city: 'Customercity',
        ...Object.fromEntries([...Array(10).keys()].map(i => [`gpp${i}`, `CUSTGPP${i}`])),
    })
}

function zones(count: number, role: string): InvoiceTemplateZoneVars[] {
    return [...Array(count).keys()].map(i => {
        const zone = new InvoiceTemplateZoneVars({
            zone: `Zone ${i + 1}`,
            zone_detail: `Detail ${i + 1}`,
            number: 10 * (i + 1),
            duration: 600 * (i + 1),
            customercost: 1000 * (i + 1),
            resellercost: 800 * (i + 1),
            carriercost: 600 * (i + 1),
        })
        // the cost fields depend on the role
        if (role != RbacRole.admin && role != RbacRole.system)
            delete zone.carriercost
        if (role != RbacRole.admin && role != RbacRole.system && role != RbacRole.reseller)
            delete zone.resellercost
        return zone
    })
}

function zonesTotal(data: InvoiceTemplateZoneVars[], category: InvoiceTemplateCategory): InvoiceTemplateZonesVars {
    const costField = category == InvoiceTemplateCategory.Reseller
        ? 'resellercost'
        : category == InvoiceTemplateCategory.Peer ? 'carriercost' : 'customercost'
    return new InvoiceTemplateZonesVars({
        totalcost: data.reduce((sum, z) => sum + (z[costField] ?? 0), 0),
        totalduration: data.reduce((sum, z) => sum + z.duration, 0),
        data: data,
    })
}

/**
 * Returns all variables supported by an invoice template of the given category,
 * filled with example values.
 *
 * - all categories: rescontact, customer, custcontact, billprof, invoice, zones (zones only for the layout markers)
 * - customer: calls
 * - did: did_zones
 */
export function getInvoiceTemplateVars(
    category: InvoiceTemplateCategory,
    callDirection: InvoiceTemplateCallDirection = InvoiceTemplateCallDirection.Out,
    role: string = RbacRole.admin,
): InvoiceTemplateVars {
    const customer = new InvoiceTemplateCustomerVars()
    const contact = customerContact()
    const zoneData = zones(3, role)
    const zonesVars = zonesTotal(zoneData, category)
    const amountNet = zonesVars.totalcost
    const amountVat = 0

    const vars: InvoiceTemplateVars = {
        rescontact: new InvoiceTemplateContactVars(),
        customer: customer,
        custcontact: contact,
        billprof: new InvoiceTemplateBillingProfileVars(),
        invoice: new InvoiceTemplateInvoiceVars({
            amount_net: amountNet,
            amount_vat: amountVat,
            amount_total: amountNet + amountVat,
            call_direction: callDirectionLabel[callDirection] ?? '',
        }),
        zones: zonesVars,
    }

    if (category == InvoiceTemplateCategory.Customer) {
        vars.calls = [...Array(3).keys()].map(i => new InvoiceTemplateCallVars({
            destination_user_in: `1${i + 1}1234567890`,
            start_time: 1788220800 + i * 3600,
            duration: 60 * (i + 1),
            cost: 10 * (i + 1),
            zone: `Zone ${i + 1}`,
            zone_detail: `Detail ${i + 1}`,
        }))
    }

    if (category == InvoiceTemplateCategory.Did) {
        const didZones = zonesTotal(zones(2, role), category)
        vars.did_zones = [new InvoiceTemplateDidZoneVars({
            totalcost: didZones.totalcost,
            totalduration: didZones.totalduration,
            data: didZones.data,
        })]
    }

    return vars
}
