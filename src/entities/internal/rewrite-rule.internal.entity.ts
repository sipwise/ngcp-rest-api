export enum RewriteRuleDirection {
    In = 'in',
    Out = 'out',
    Lnp = 'lnp',
}

export enum RewriteRuleField {
    Caller = 'caller',
    Callee = 'callee',
}

export class RewriteRule {
    id!: number
    setId!: number
    matchPattern!: string
    replacePattern!: string
    description!: string
    direction!: RewriteRuleDirection
    field!: RewriteRuleField
    priority!: number
    enabled!: boolean
}