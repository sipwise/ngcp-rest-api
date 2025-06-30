export class NumberSearchDto {
    subscriber_id: number = undefined
    is_primary: boolean = undefined
    is_devid: boolean = undefined
    number_id: number = undefined
    cc: number = undefined
    ac: string = undefined
    sn: string = undefined
    _alias = {
        id: 'voipNumber.id',
    }
}