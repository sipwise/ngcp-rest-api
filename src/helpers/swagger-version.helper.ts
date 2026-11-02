import {existsSync, readFileSync} from 'fs'

export interface Versions {
    // the platform release, /etc/ngcp_version: "trunk", "mr12.5.1"
    ngcp?: string
    // the package version without the upstream part: "12.5.1.11+0~mr12.5.1.11" is "mr12.5.1.11"
    api?: string
}

// read once at the start: an upgrade of the platform reinstalls and restarts the service; the package version is
// the one of the build (webpack, from debian/changelog), the changelog of the sources otherwise
export function readVersions(): Versions {
    const read = (file: string): string | undefined => existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined
    const version = process.env.NGCP_REST_API_VERSION
        || /^\S+ \(([^)]+)\)/.exec(read('./debian/changelog') ?? '')?.[1]
    return {
        ngcp: read('/etc/ngcp_version') || undefined,
        api: version ? version.replace(/^[^~]*~/, '') : undefined,
    }
}
