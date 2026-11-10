jest.mock('child_process', () => ({
    ...jest.requireActual<typeof import('child_process')>('child_process'),
    execFile: jest.fn(),
}))

import {execFile} from 'child_process'

import {BadRequestException, InternalServerErrorException, UnprocessableEntityException} from '@nestjs/common'
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

    const uuid = '31a16db6-e160-4a94-b7ff-bd4d1480c6b1'
    const basePath = `${voicemailSpoolDir}${uuid}`
    type ExecCb = (err: Error | null, res?: unknown) => void
    const execMock = execFile as unknown as jest.Mock

    const makeVoicemail = (id: number, dir: string, msgnum = 0): internal.Voicemail =>
        internal.Voicemail.create({
            id, dir, mailboxuser: uuid, msgnum, username: '4311', callerid: '4312', duration: 5, call_id: 'cid' + id,
            origtime: '1700000000',
        } as unknown as internal.Voicemail)

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

    afterEach(() => {
        jest.restoreAllMocks()
        execMock.mockReset()
    })

    describe('read', () => {
        it('returns the voicemail from the repository', async () => {
            const vm = makeVoicemail(1, `${basePath}/INBOX`)
            const spy = jest.spyOn(voicemailMockRepo, 'read').mockResolvedValue(vm)
            await expect(service.read(1, sr)).resolves.toBe(vm)
            expect(spy).toHaveBeenCalledWith(1, sr)
        })
    })

    describe('readAll', () => {
        it('returns the list and count from the repository', async () => {
            const vm = makeVoicemail(1, `${basePath}/INBOX`)
            jest.spyOn(voicemailMockRepo, 'readAll').mockResolvedValue([[vm], 1])
            await expect(service.readAll(sr)).resolves.toEqual([[vm], 1])
        })
    })

    describe('sendNotification', () => {
        it('calls ngcp-vmnotify with the message args and the default action', async () => {
            jest.spyOn(voicemailMockRepo, 'readMessagesCountByUUID').mockResolvedValue({new_messages: 2, old_messages: 3})
            execMock.mockImplementation((_cmd, _args, _opts, cb: ExecCb) => { cb(null, {stdout: '', stderr: ''}) })
            await service.sendNotification(makeVoicemail(7, `${basePath}/INBOX`, 4), sr)
            expect(execMock).toHaveBeenCalledTimes(1)
            const [cmd, args, opts] = execMock.mock.calls[0]
            expect(cmd).toEqual('/usr/bin/ngcp-vmnotify')
            expect(args).toEqual([
                'default', '4311', uuid, '2', '3', '0', '4', '4312', '2023-11-14T22:13:20.000Z', '5', 'r', '7', 'cid7',
            ])
            expect(opts).toMatchObject({shell: false})
        })

        it('uses the given action type', async () => {
            execMock.mockImplementation((_cmd, _args, _opts, cb: ExecCb) => { cb(null, {stdout: '', stderr: ''}) })
            await service.sendNotification(makeVoicemail(7, `${basePath}/INBOX`), sr, 'd')
            expect(execMock.mock.calls[0][1].slice(-3)).toEqual(['d', '7', 'cid7'])
        })

        it('throws 422 when the notify command fails', async () => {
            execMock.mockImplementation((_cmd, _args, _opts, cb: ExecCb) => { cb(Object.assign(new Error('fail'), {cmd: 'x', stdout: '', stderr: 'boom'})) })
            await expect(service.sendNotification(makeVoicemail(7, `${basePath}/INBOX`), sr)).rejects.toThrow(UnprocessableEntityException)
        })
    })

    describe('delete', () => {
        it('deletes, renumbers each affected folder once and notifies every voicemail', async () => {
            const vms = [
                makeVoicemail(1, `${basePath}/INBOX`, 0),
                makeVoicemail(2, `${basePath}/INBOX`, 1),
                makeVoicemail(3, `${basePath}/Old`, 0),
            ]
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue(vms)
            const delSpy = jest.spyOn(voicemailMockRepo, 'delete').mockResolvedValue([1, 2, 3])
            const renumberSpy = jest.spyOn(voicemailMockRepo, 'renumberDir')
            const notifySpy = jest.spyOn(service, 'sendNotification').mockResolvedValue()
            await expect(committed(() => service.delete([1, 2, 3], sr))).resolves.toEqual([1, 2, 3])
            expect(delSpy).toHaveBeenCalledWith([1, 2, 3], sr)
            expect(renumberSpy).toHaveBeenCalledTimes(2)
            expect(renumberSpy).toHaveBeenCalledWith(uuid, `${basePath}/INBOX`, sr)
            expect(renumberSpy).toHaveBeenCalledWith(uuid, `${basePath}/Old`, sr)
            expect(notifySpy).toHaveBeenCalledTimes(3)
            expect(notifySpy).toHaveBeenCalledWith(vms[0], sr, 'd')
        })

        it('notifies only after the commit', async () => {
            const vm = makeVoicemail(1, `${basePath}/INBOX`, 0)
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([vm])
            jest.spyOn(voicemailMockRepo, 'delete').mockResolvedValue([1])
            const notifySpy = jest.spyOn(service, 'sendNotification').mockResolvedValue()
            await committed(() => service.delete([1], sr), false)
            expect(notifySpy).not.toHaveBeenCalled()
            await committed(() => service.delete([1], sr))
            expect(notifySpy).toHaveBeenCalledWith(vm, sr, 'd')
        })

        it('notifies the other voicemails when one notification fails', async () => {
            const vms = [makeVoicemail(1, `${basePath}/INBOX`, 0), makeVoicemail(2, `${basePath}/INBOX`, 1)]
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue(vms)
            jest.spyOn(voicemailMockRepo, 'delete').mockResolvedValue([1, 2])
            const notifySpy = jest.spyOn(service, 'sendNotification')
                .mockRejectedValueOnce(new UnprocessableEntityException())
                .mockResolvedValue()
            await expect(committed(() => service.delete([1, 2], sr))).resolves.toEqual([1, 2])
            expect(notifySpy).toHaveBeenCalledTimes(2)
            expect(notifySpy).toHaveBeenLastCalledWith(vms[1], sr, 'd')
        })

        it('does nothing besides the delete for no voicemails', async () => {
            const renumberSpy = jest.spyOn(voicemailMockRepo, 'renumberDir')
            const notifySpy = jest.spyOn(service, 'sendNotification').mockResolvedValue()
            await committed(() => service.delete([], sr))
            expect(renumberSpy).not.toHaveBeenCalled()
            expect(notifySpy).not.toHaveBeenCalled()
        })
    })

    describe('update', () => {
        const voicemail = (id: number, dir: string): internal.Voicemail =>
            internal.Voicemail.create({id, dir, mailboxuser: uuid, msgnum: 0} as internal.Voicemail)

        const folderUpdate = (id: number, folder: string): Dictionary<internal.Voicemail> =>
            new Dictionary<internal.Voicemail>(id.toString(), internal.Voicemail.create({id, dir: folder} as internal.Voicemail))

        let updateSpy: jest.SpyInstance
        let renumberSpy: jest.SpyInstance
        let notifySpy: jest.SpyInstance

        beforeEach(() => {
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

        it('throws 422 when some ids do not exist', async () => {
            jest.spyOn(voicemailMockRepo, 'readCountOfIds').mockResolvedValue(0)
            await expect(committed(() => service.update(folderUpdate(1, 'Old'), sr))).rejects.toThrow(UnprocessableEntityException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('throws 400 for an unsupported folder', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/INBOX`)])
            await expect(committed(() => service.update(folderUpdate(1, 'Nope'), sr))).rejects.toThrow(BadRequestException)
            expect(updateSpy).not.toHaveBeenCalled()
        })

        it('matches the folder name case-insensitively', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/Old`)])
            await committed(() => service.update(folderUpdate(1, 'inbox'), sr))
            expect(updateSpy.mock.calls[0][0]['1'].dir).toEqual(`${basePath}/INBOX`)
            expect(notifySpy).toHaveBeenCalledWith(expect.anything(), sr, 'x')
        })

        it('appends after the highest msgnum of the destination folder', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/INBOX`)])
            const maxSpy = jest.spyOn(voicemailMockRepo, 'readMaxMsgnumByDir').mockResolvedValue(4)
            await committed(() => service.update(folderUpdate(1, 'Work'), sr))
            expect(maxSpy).toHaveBeenCalledWith(uuid, `${basePath}/Work`, sr)
            expect(updateSpy.mock.calls[0][0]['1'].msgnum).toEqual(5)
        })

        it('gives consecutive msgnums to several messages moved into one folder', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([
                voicemail(1, `${basePath}/INBOX`), voicemail(2, `${basePath}/INBOX`),
            ])
            const maxSpy = jest.spyOn(voicemailMockRepo, 'readMaxMsgnumByDir').mockResolvedValue(4)
            const updates = folderUpdate(1, 'Work')
            updates['2'] = internal.Voicemail.create({id: 2, dir: 'Work'} as internal.Voicemail)
            await committed(() => service.update(updates, sr))
            expect(maxSpy).toHaveBeenCalledTimes(1)
            expect(updateSpy.mock.calls[0][0]['1'].msgnum).toEqual(5)
            expect(updateSpy.mock.calls[0][0]['2'].msgnum).toEqual(6)
            expect(renumberSpy).toHaveBeenCalledTimes(1)
            expect(notifySpy).toHaveBeenCalledTimes(2)
        })

        it('updates without folder handling when no dir is given', async () => {
            jest.spyOn(voicemailMockRepo, 'readWhereInIds').mockResolvedValue([voicemail(1, `${basePath}/INBOX`)])
            const maxSpy = jest.spyOn(voicemailMockRepo, 'readMaxMsgnumByDir')
            const updates = new Dictionary<internal.Voicemail>('1', internal.Voicemail.create({id: 1} as internal.Voicemail))
            await expect(committed(() => service.update(updates, sr))).resolves.toEqual([1])
            expect(maxSpy).not.toHaveBeenCalled()
            expect(renumberSpy).not.toHaveBeenCalled()
            expect(notifySpy).not.toHaveBeenCalled()
        })
    })

})
