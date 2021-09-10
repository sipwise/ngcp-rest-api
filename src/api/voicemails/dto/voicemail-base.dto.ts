export class VoicemailBaseDto {
    caller: string
    duration: number
    folder?: VoicemailFolder
    subscriber_id: number
    time: string // TODO: check why there is either date nor input validation in v1
}

enum VoicemailFolder {
    Cust1 = 'Cust1',
    Cust2 = 'Cust2',
    Cust3 = 'Cust3',
    Cust4 = 'Cust4',
    Cust5 = 'Cust5',
    Cust6 = 'Cust6',
    Family = 'Family',
    Friends = 'Friends',
    Inbox = 'INBOX',
    Old = 'Old',
    Work = 'Work',
}
