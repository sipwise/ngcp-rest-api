import {BanRegistrationRedisRepository} from './registration.redis.repository'

import {TaskAgentHelper} from '~/helpers/task-agent.helper'

const dump = [
    'name: alice@example.org::auth_count value: 3',
    'name: alice@example.org::last_auth value: 1700000000',
]

describe('BanRegistrationRedisRepository', () => {
    let repo: BanRegistrationRedisRepository
    let invokeTask: jest.SpyInstance

    beforeEach(() => {
        const taskAgentHelper = new TaskAgentHelper(undefined, undefined)
        invokeTask = jest.spyOn(taskAgentHelper, 'invokeTask')
            .mockResolvedValueOnce(dump)
            .mockResolvedValueOnce(dump)
        repo = new BanRegistrationRedisRepository(undefined, taskAgentHelper)
    })

    it('waits for the task agent to delete the ban', async () => {
        const [banned] = await repo.readBannedRegistrations()
        invokeTask.mockResolvedValueOnce([])

        await repo.deleteBannedRegistration(banned.id)

        expect(invokeTask).toHaveBeenCalledTimes(3)
        const request = invokeTask.mock.calls[2][2]
        expect(request.task).toBe('kam_lb_security_ban_delete')
        expect(request.data).toBe(JSON.stringify({extra_args: 'auth alice@example.org::auth_count'}))
    })

    it('passes a task agent error on to the caller', async () => {
        const [banned] = await repo.readBannedRegistrations()
        invokeTask.mockRejectedValueOnce(new Error('task agent failed'))

        await expect(repo.deleteBannedRegistration(banned.id)).rejects.toThrow('task agent failed')
    })
})
