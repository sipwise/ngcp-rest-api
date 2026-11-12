export class SubscriberRedisMockRepository {
    readonly removedLocations: string[][] = []
    trustedHostsReloads = 0

    async removeLocations(aors: string[]): Promise<void> {
        this.removedLocations.push(aors)
    }

    async reloadTrustedHosts(): Promise<void> {
        this.trustedHostsReloads++
    }
}
