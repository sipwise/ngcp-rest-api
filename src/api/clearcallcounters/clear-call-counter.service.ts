import {Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {LoggerService} from '../../logger/logger.service'
import {execFile} from 'child_process'
import {promisify} from 'util'
import {I18nService} from 'nestjs-i18n'

const execFileAsync = promisify(execFile)

@Injectable()
export class ClearCallCounterService {
    private readonly log = new LoggerService(ClearCallCounterService.name)

    constructor(
        private readonly i18n: I18nService,
    ) {
    }

    async create(callId: internal.CallId, sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            user: sr.user.username,
        })

        await execFileAsync('/usr/sbin/ngcp-dlgcnt-clean', [callId.id], {timeout: 5 * 1000}).then(ret => {
            return true
        })
            .catch(error => {
                this.log.error(`execFileAsync ${error.cmd} error: ${error.stdout}, ${error.stderr}`)
                throw new UnprocessableEntityException(this.i18n.t('errors.REQUEST_PROCESSING_ERROR'))
            })

        return true
    }
}
