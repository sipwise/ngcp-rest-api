import {Event,State} from 'jest-circus'
import type {Circus} from '@jest/types'
import NodeEnvironment from 'jest-environment-node'

class JestEnvironmentFailFast extends NodeEnvironment  {
    async handleTestEvent(event: Event, state: State) {
        if (event.name === 'hook_failure' || event.name === 'test_fn_failure') {
            if (!event.test)
                return
            const parent = event.test.parent
            await this.recurseSkipChildren(parent.parent ?? parent)
        }
    }

    async recurseSkipChildren(entry: Circus.DescribeBlock) {
        entry.children.forEach(async (child) => {
            child.mode = 'skip'
            if (child.type == 'describeBlock')
                await this.recurseSkipChildren(child)
        })
    }
}

module.exports = JestEnvironmentFailFast
