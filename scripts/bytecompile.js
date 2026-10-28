'use strict'

// Post-build step for `build:prod`: compile the webpack bundle prod/server.js to
// V8 bytecode (prod/server.jsc) and replace prod/server.js with a tiny loader stub.
// The shipped code is no longer readable, while function/class names and positions
// are preserved in the bytecode so stack traces stay valid.
//
// bytenode's runtime is vendored into prod/bytenode by webpack (CopyWebpackPlugin),
// because prod/ is shipped without node_modules. The loader requires it before the
// .jsc so the .jsc extension handler and the V8 flags (--no-lazy, --no-flush-bytecode)
// are in place when the bytecode is loaded.

const fs = require('fs')
const path = require('path')
const bytenode = require('bytenode')

const prodDir = path.resolve(__dirname, '..', 'prod')
const bundle = path.join(prodDir, 'server.js')
const compiled = path.join(prodDir, 'server.jsc')

const loaderStub = [
    '\'use strict\'',
    'require(\'./bytenode\')',
    'module.exports = require(\'./server.jsc\')',
    '',
].join('\n')

async function main() {
    if (!fs.existsSync(bundle)) {
        throw new Error(`bundle not found: ${bundle} (run webpack first)`)
    }
    if (!fs.existsSync(path.join(prodDir, 'bytenode', 'index.js'))) {
        throw new Error('prod/bytenode runtime missing (CopyWebpackPlugin step)')
    }

    await bytenode.compileFile({
        filename: bundle,
        output: compiled,
        compileAsModule: true,
    })

    fs.writeFileSync(bundle, loaderStub)

    // eslint-disable-next-line no-console
    console.log(`bytecode: wrote ${path.relative(prodDir, compiled)}, replaced server.js with loader`)
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
})
