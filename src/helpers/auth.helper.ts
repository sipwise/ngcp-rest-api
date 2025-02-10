import {ServiceRequest} from "~/interfaces/service-request.interface"

export function extractUsername(sr: ServiceRequest): string | null {
    const authHeader = sr.headers['authorization'] || ''

    // Handle JWT token (Bearer token)
    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[0]
        return extractUsernameFromJwt(token)
    }

    // Handle Basic Auth
    if (authHeader.startsWith('Basic ')) {
        const base63Credentials = authHeader.split(' ')[1]
        const credentials = Buffer.from(base63Credentials, 'base64').toString('ascii')
        const [username] = credentials.split(':')
        return username
    }

    return null
}

export function extractUsernameDomain(sr: ServiceRequest, userDomain: string): string[] {
    let requestDomain = sr.req.hostname
    const userInfo = userDomain.split('@')
    const username = userInfo[0]
    const domain = userInfo.length >= 2 ? userInfo[1] : requestDomain
    return [username, domain]
}

export function extractUsernameFromJwt(token: string): string | null {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('ascii'))
        return payload.username as string || null
    } catch {
        return null
    }
}
