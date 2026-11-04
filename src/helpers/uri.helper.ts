/**
 * Extracts the API resource name from the path pattern of the matched route: the path without the API prefix,
 * the route parameters and a trailing `journal` segment, e.g. `/api/customers/{:customerId/}phonebook/:id/journal`
 * is `customers/phonebook`
 * @param routePath path pattern of the route (`req.route.path`)
 * @param prefix API prefix
 */
export function extractResourceName(routePath: string, prefix: string): string {
    const segments = routePath
        .replace(/[:*]\w+/g, '')
        .replace(/[{}]/g, '')
        .split('/')
        .filter(segment => segment)
    const prefixSegments = prefix.split('/').filter(segment => segment)
    if (prefixSegments.every((segment, i) => segments[i] === segment))
        segments.splice(0, prefixSegments.length)
    if (segments.at(-1) === 'journal')
        segments.pop()
    return segments.join('/')
}

export function prepareUrlReference(url: string, removeLeadingResourceId?: boolean): string {
    if (!url)
        return ''
    const removeLeadingSlash = url.endsWith('/') ? url.slice(0, -1) : url
    const strippedUrl = stripQueryParams(removeLeadingSlash)
    if (!removeLeadingResourceId) {
        return strippedUrl
    }
    return strippedUrl.split('/').slice(0, -1).join('/')
}

export function stripQueryParams(url: string): string {
    return url.split('?')[0]
}