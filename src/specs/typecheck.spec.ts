import {execFileSync} from 'child_process'

test("typechecks", () => {
    try {
        execFileSync('tsc', ['--pretty', '--skipLibCheck', '--noEmit'], {timeout: 30 * 1000})
    }
    catch(e) {
        throw(e.stdout.toString())
    }
})
