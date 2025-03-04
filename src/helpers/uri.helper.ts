/**
 * Extracs the API resource name from request URL
 * @param url URL of requested resource
 * @param prefix API prefix
 */
export function extractResourceName(url: string, prefix: string): string {
    if (url.startsWith('/')) {
        url = url.slice(1)
    }
    if (url.startsWith(prefix)) {
        return url.slice(prefix.length + 1).split('/')[0]
    }
    return url.split('/')[0]
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