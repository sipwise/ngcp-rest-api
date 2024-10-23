export interface CallIdInternalEntity {
    id: string
}

export class CallId implements CallIdInternalEntity {
    id: string

    constructor(
        callId?: string,
    ) {
        this.id = callId
    }
}