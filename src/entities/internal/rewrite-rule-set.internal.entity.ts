
export class RewriteRuleSet {
    id: number
    resellerId: number
    name: string
    description?: string
    callerInDpid?: number
    calleeInDpid?: number
    callerOutDpid?: number
    calleeOutDpid?: number
    callerLnpDpid?: number
    calleeLnpDpid?: number
}