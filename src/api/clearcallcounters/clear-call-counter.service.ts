import {Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {internal} from '../../entities'
import {LoggerService} from '../../logger/logger.service'
import {execFile} from 'child_process'
import {Messages} from '../../config/messages.config'
import {promisify} from 'util'

const execFileAsync = promisify(execFile);

@Injectable()
export class ClearCallCounterService {
    private readonly log = new LoggerService(ClearCallCounterService.name)

    constructor(
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
            throw new UnprocessableEntityException(Messages.invoke(Messages.REQUEST_PROCESSING_ERROR, sr))
        })

        return true
    }
}
