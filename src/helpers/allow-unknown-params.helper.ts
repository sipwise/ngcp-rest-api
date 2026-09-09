import {QueriesDictionary} from '~/interfaces/service-request.interface'

export function isAllowUnknownParams(params: QueriesDictionary): boolean {
    const value = params['allow_unknown_params']
    return value === 'true' || value === '1'
}
