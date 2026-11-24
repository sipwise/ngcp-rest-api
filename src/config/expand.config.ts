export interface ExpandRule {
    // resource path of the target collection (controller path and the path of its readAll route)
    target: string
}

/**
 * Global expand mapping: response DTO field name -> target collection. A DTO field may override it with
 * @Expand('<target>') or opt out with @NoExpand().
 */
export const expandConfig: Readonly<Record<string, ExpandRule>> = {
    contact_id: {target: 'customercontacts'},
    contract_id: {target: 'contracts'},
    customer_id: {target: 'customers'},
    domain_id: {target: 'domains'},
    invoice_template_id: {target: 'templates/invoices'},
    ncos_level_id: {target: 'ncos/levels'},
    pbx_group_ids: {target: 'subscribers'},
    pbx_groupmember_ids: {target: 'subscribers'},
    reseller_id: {target: 'resellers'},
    rwr_set_id: {target: 'rewrite-rules/sets'},
    subscriber_id: {target: 'subscribers'},
    time_set_id: {target: 'time-sets'},
}
