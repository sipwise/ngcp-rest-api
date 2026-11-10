import {InternalServerErrorException} from '@nestjs/common'
import {Test, TestingModule} from '@nestjs/testing'

import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'
import {VoicemailMockRepository} from './repositories/voicemail.mock.repository'
import {VoicemailModule} from './voicemail.module'
import {VoicemailService} from './voicemail.service'

import {AppModule} from '~/app.module'
import {AuthResponseDto} from '~/auth/dto/auth-response.dto'
import {internal} from '~/entities'
import {voicemailSpoolDir} from '~/enums/supported-voicemail-folders.enum'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ExpandModule} from '~/helpers/expand.module'
import {postCommitQueueStorage} from '~/helpers/post-commit-queue.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

const user: AuthResponseDto = {
    readOnly: false,
    showPasswords: true,
    active: true,
    id: 1,
    is_master: true,
    reseller_id: 2,
    reseller_id_required: false,
    role: 'system',
    username: 'administrator',
}

describe('VoicemailsService', () => {
    let service: VoicemailService
    let voicemailMockRepo: VoicemailMockRepository

    let sr: ServiceRequest

    beforeAll(async () => {
        voicemailMockRepo = new VoicemailMockRepository()
        const module: TestingModule = await Test.createTestingModule({
            imports: [VoicemailModule, ExpandModule, AppModule],
        })
            .overrideProvider(VoicemailMariadbRepository).useValue(voicemailMockRepo)
            .compile()

        service = module.get<VoicemailService>(VoicemailService)
        sr = {headers: [undefined], params: undefined, query: undefined, user: user, req: undefined, returnContent:undefined}
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
        expect(voicemailMockRepo).toBeDefined()
    })

    // runs fn like TransactionInterceptor: the post-commit callbacks after it resolves, each one's error only logged
    const committed = async <T>(fn: () => Promise<T>, commit = true): Promise<T> => {
        const store = {callbacks: []}
        const result = await postCommitQueueStorage.run(store, fn)
        if (commit) {
            for (const cb of store.callbacks)
                await Promise.resolve(cb()).catch(() => undefined)
        }
        return result
    }

    // describe('read', () => {

    // })

    // describe('readAll', () => {

    // })

    // describe('create', () => {

    // })

    describe('update', () => {
        const uuid = '31a16db6-e160-4a94-b7ff-bd4d1480c6b1'
        const basePath = `${voicemailSpoolDir}${uuid}`

        const voicemail = (id: number, dir: string): internal.Voicemail =>
            internal.Voicemail.create({id, dir, mailboxuser: uuid, msgnum: 0} as internal.Voicemail)

        const folderUpdate = (id: number, folder: string): Dictionary<internal.Voicemail> =>
            new Dictionary<internal.Voicemail>(id.toString(), internal.Voicemail.create({id, dir: folder} as internal.Voicemail))

        let updateSpy: jest.SpyInstance
        let renumberSpy: jest.SpyInstance
        let notifySpy: jest.SpyInstance

        beforeEach(() => {
            jest.restoreAllMocks()
            updateSpy = jest.spyOn(voicemailMockRepo, 'update').mockResolvedValue([1])
            renumberSpy = jest.spyOn(voicemailMockRepo, 'renumberDir')
            notifySpy = jest.spyOn(service, 'sendNotification').mockResolvedValue()
            jest.spyOn(voicemailMockRepo, 'read').mockResolvedValue(voicemail(1, `${basePath}/INBOX`))
        })

        it('keeps full path when the folder is unchanged', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/Old`)])
            await committed(() => service.update(folderUpdate(1, 'Old'), sr))
            expect(updateSpy.mock.calls[0][0]['1'].dir).toEqual(`${basePath}/Old`)
            expect(updateSpy.mock.calls[0][0]['1'].msgnum).toBeUndefined()
            expect(renumberSpy).not.toHaveBeenCalled()
            expect(notifySpy).not.toHaveBeenCalled()
        })

        it('writes full path when the folder is changed', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/INBOX`)])
            await committed(() => service.update(folderUpdate(1, 'Old'), sr))
            expect(updateSpy.mock.calls[0][0]['1'].dir).toEqual(`${basePath}/Old`)
            expect(updateSpy.mock.calls[0][0]['1'].msgnum).toEqual(0)
            expect(renumberSpy).toHaveBeenCalledWith(uuid, `${basePath}/INBOX`, sr)
            expect(notifySpy).toHaveBeenCalledWith(expect.anything(), sr, 'r')
        })

        it('reads and notifies the moved voicemail only after the commit', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/INBOX`)])
            const readSpy = jest.spyOn(voicemailMockRepo, 'read')
            await committed(() => service.update(folderUpdate(1, 'Old'), sr), false)
            expect(readSpy).not.toHaveBeenCalled()
            expect(notifySpy).not.toHaveBeenCalled()
        })

        it('uses x action type when moving to INBOX', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/Old`)])
            await committed(() => service.update(folderUpdate(1, 'INBOX'), sr))
            expect(updateSpy.mock.calls[0][0]['1'].dir).toEqual(`${basePath}/INBOX`)
            expect(notifySpy).toHaveBeenCalledWith(expect.anything(), sr, 'x')
        })

        it('repairs a stored dir without full path', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, 'Old')])
            await committed(() => service.update(folderUpdate(1, 'Old'), sr))
            expect(updateSpy.mock.calls[0][0]['1'].dir).toEqual(`${basePath}/Old`)
        })

        it('throws internal error when dir would be saved without full path', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([])
            await expect(committed(() => service.update(folderUpdate(1, 'Old'), sr))).rejects.toThrow(InternalServerErrorException)
            expect(updateSpy).not.toHaveBeenCalled()
        })
    })

    // describe('adjust', () => {

    // })

    describe('delete', () => {
        const uuid = '31a16db6-e160-4a94-b7ff-bd4d1480c6b1'
        const basePath = `${voicemailSpoolDir}${uuid}`

        const voicemail = (id: number, msgnum: number): internal.Voicemail =>
            internal.Voicemail.create({id, dir: `${basePath}/INBOX`, mailboxuser: uuid, msgnum} as internal.Voicemail)

        const vms = [voicemail(1, 0), voicemail(2, 1)]
        let notifySpy: jest.SpyInstance

        beforeEach(() => {
            jest.restoreAllMocks()
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue(vms)
            jest.spyOn(voicemailMockRepo, 'delete').mockResolvedValue([1, 2])
            jest.spyOn(voicemailMockRepo, 'renumberDir').mockResolvedValue()
            notifySpy = jest.spyOn(service, 'sendNotification').mockResolvedValue()
        })

        it('notifies only after the commit', async () => {
            await committed(() => service.delete([1, 2], sr), false)
            expect(notifySpy).not.toHaveBeenCalled()
            await committed(() => service.delete([1, 2], sr))
            expect(notifySpy).toHaveBeenCalledTimes(2)
            expect(notifySpy).toHaveBeenCalledWith(vms[0], sr, 'd')
        })

        it('notifies the other voicemails when one notification fails', async () => {
            notifySpy.mockRejectedValueOnce(new Error('vmnotify failed'))
            await expect(committed(() => service.delete([1, 2], sr))).resolves.toEqual([1, 2])
            expect(notifySpy).toHaveBeenCalledTimes(2)
            expect(notifySpy).toHaveBeenLastCalledWith(vms[1], sr, 'd')
        })
    })

})
