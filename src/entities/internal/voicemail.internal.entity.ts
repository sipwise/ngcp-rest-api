export interface VoicemailInternalEntity {
    id: number
    call_id: string
    callerid: string
    context: string
    dir: string
    duration: string
    flag: string
    macrocontext: string
    mailboxcontext: string
    mailboxuser: string
    msg_id: string
    msgnum: number
    origtime: string
    recording: Buffer
    subscriber_id: number
    username: string
}

export class Voicemail implements VoicemailInternalEntity {
    id: number
    call_id: string
    callerid: string
    context: string
    dir: string
    duration: string
    flag: string
    macrocontext: string
    mailboxcontext: string
    mailboxuser: string
    msg_id: string
    msgnum: number
    origtime: string
    recording: Buffer
    subscriber_id: number
    username: string

    static create(data: VoicemailInternalEntity): Voicemail {
        const voicemail = new Voicemail()

        Object.keys(data).map(key => {
            voicemail[key] = data[key]
        })
        return voicemail
    }
}