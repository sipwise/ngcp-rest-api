import {I18nService} from 'nestjs-i18n'

import {AppService} from '~/app.service'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'

describe('TaskAgentHelper.invokeTask', () => {
    let helper: TaskAgentHelper
    let callback: (response: TaskAgentResponse) => Promise<void>
    let request: TaskAgentRequest

    const respond = (status: string, extra: Partial<TaskAgentResponse> = {}): Promise<void> =>
        callback({uuid: `node-${status}`, ref: request.uuid, src: 'sp1', status, ...extra} as TaskAgentResponse)

    // publishes feed the given responses into the captured feedback callback
    const publishAnswers = (answers: Partial<TaskAgentResponse>[]): void => {
        jest.spyOn(helper, 'publishToTaskAgent').mockImplementation(async () => {
            for (const answer of answers) {
                await respond(answer.status as string, answer)
            }
        })
    }

    beforeEach(() => {
        helper = new TaskAgentHelper({} as AppService, {} as I18nService)
        jest.spyOn(helper, 'subscribeToFeedback').mockImplementation((_channel, cb) => {
            callback = cb
            return Promise.resolve()
        })
        jest.spyOn(helper, 'unsubscriberFromFeedback').mockResolvedValue()
        request = helper.buildRequest({feedbackChannel: 'test', task: 'test_task'}).request
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('returns the data of an accepted and done node', async () => {
        publishAnswers([
            {status: 'accepted'},
            {status: 'done', data: JSON.stringify([{a: 1}])},
        ])
        expect(await helper.invokeTask('channel', 'feedback', request)).toEqual([{a: 1}])
    })

    it('finishes on error after accepted without waiting for a timeout', async () => {
        publishAnswers([
            {status: 'accepted'},
            {status: 'error', reason: 'boom'},
        ])
        const start = Date.now()
        expect(await helper.invokeTask('channel', 'feedback', request)).toEqual([])
        expect(Date.now() - start).toBeLessThan(1000)
    })

    it('finishes on an immediate error without waiting for the no-response timeout', async () => {
        publishAnswers([{status: 'error', reason: 'boom'}])
        const start = Date.now()
        expect(await helper.invokeTask('channel', 'feedback', request)).toEqual([])
        expect(Date.now() - start).toBeLessThan(1000)
    })

    it('finishes on rejected without waiting for the no-response timeout', async () => {
        publishAnswers([{status: 'rejected', reason: 'no uuid'}])
        const start = Date.now()
        expect(await helper.invokeTask('channel', 'feedback', request)).toEqual([])
        expect(Date.now() - start).toBeLessThan(1000)
    })

    it('ignores responses of other requests', async () => {
        jest.spyOn(helper, 'publishToTaskAgent').mockImplementation(async () => {
            await callback({uuid: 'x', ref: 'foreign', src: 'sp1', status: 'done', data: '{"foreign":true}'} as TaskAgentResponse)
            await respond('accepted')
            await respond('done', {data: JSON.stringify({b: 2})})
        })
        expect(await helper.invokeTask('channel', 'feedback', request)).toEqual([{b: 2}])
    })

    describe('max timeout', () => {
        let logSpy: jest.SpyInstance
        let errorSpy: jest.SpyInstance

        beforeEach(() => {
            jest.useFakeTimers()
            logSpy = jest.spyOn(helper['log'], 'log').mockImplementation()
            errorSpy = jest.spyOn(helper['log'], 'error').mockImplementation()
            publishAnswers([{status: 'accepted'}])
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it('logs a long running task still running at the max timeout as info', async () => {
            const result = helper.invokeTask('channel', 'feedback', request, undefined, {longRunning: true})
            await jest.advanceTimersByTimeAsync(10_500)
            expect(await result).toBeUndefined()
            expect(logSpy).toHaveBeenCalledTimes(1)
            expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Task still running after max timeout'))
            expect(errorSpy).not.toHaveBeenCalled()
        })

        it('logs a task still running at the max timeout as error', async () => {
            const result = helper.invokeTask('channel', 'feedback', request)
            await jest.advanceTimersByTimeAsync(10_500)
            expect(await result).toBeUndefined()
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Task max response timeout'))
        })
    })
})
