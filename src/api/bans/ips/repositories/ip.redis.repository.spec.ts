import {BanIpRedisRepository} from './ip.redis.repository'

import {TaskAgentHelper} from '~/helpers/task-agent.helper'

describe('BanIpRedisRepository', () => {
    let repo: BanIpRedisRepository
    let invokeTask: jest.SpyInstance

    beforeEach(() => {
        const taskAgentHelper = new TaskAgentHelper(undefined, undefined)
        invokeTask = jest.spyOn(taskAgentHelper, 'invokeTask')
            .mockResolvedValueOnce(['name: 192.0.2.1', 'name: 192.0.2.2'])
            .mockResolvedValueOnce(['name: 192.0.2.1', 'name: 192.0.2.2'])
        repo = new BanIpRedisRepository(undefined, taskAgentHelper)
    })

    it('waits for the task agent to delete the ban', async () => {
        const [, banned] = await repo.readBannedIps()
        invokeTask.mockResolvedValueOnce([])

        await repo.deleteBannedIp(banned.id)

        expect(invokeTask).toHaveBeenCalledTimes(3)
        const request = invokeTask.mock.calls[2][2]
        expect(request.task).toBe('kam_lb_security_ban_delete')
        expect(request.data).toBe(JSON.stringify({extra_args: 'ipban 192.0.2.2'}))
    })

    it('passes a task agent error on to the caller', async () => {
        const [banned] = await repo.readBannedIps()
        invokeTask.mockRejectedValueOnce(new Error('task agent failed'))

        await expect(repo.deleteBannedIp(banned.id)).rejects.toThrow('task agent failed')
    })

    it('sends no delete for an unknown id', async () => {
        await repo.deleteBannedIp('unknown')

        expect(invokeTask).toHaveBeenCalledTimes(1)
    })
})
