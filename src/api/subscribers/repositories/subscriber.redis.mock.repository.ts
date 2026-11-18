export class SubscriberRedisMockRepository {
    readonly removedLocations: string[][] = []
    trustedHostsReloads = 0

    removeLocations(aors: string[]): Promise<void> {
        this.removedLocations.push(aors)
        return Promise.resolve()
    }

    reloadTrustedHosts(): Promise<void> {
        this.trustedHostsReloads++
        return Promise.resolve()
    }
}
