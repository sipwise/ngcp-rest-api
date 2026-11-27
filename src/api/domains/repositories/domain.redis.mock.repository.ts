export class DomainRedisMockRepository {
    reloads = 0
    readonly removedPermanentLocations: string[][] = []

    reloadDomains(): Promise<void> {
        this.reloads++
        return Promise.resolve()
    }

    removePermanentLocations(domains: string[]): Promise<void> {
        this.removedPermanentLocations.push(domains)
        return Promise.resolve()
    }
}
