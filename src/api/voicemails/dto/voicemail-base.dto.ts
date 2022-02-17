import {ApiProperty} from "@nestjs/swagger"

export class VoicemailBaseDto {
    @ApiProperty({description: "unique identifier of a voicemail"})
    id: number

    @ApiProperty({description: "the directory of the message", example: "/INBOX"})
    dir: string

    @ApiProperty({description: "caller number", })
    callerid: string

    @ApiProperty({description: "time of the message (timestamp)"})
    origtime: string

    @ApiProperty({description: "duration of the message in seconds"})
    duration: string

    @ApiProperty({description: "the uuid of mailbox's user"})
    mailboxuser: string

    @ApiProperty({description: "temporary field for the dir"})
    folder?: string
}
