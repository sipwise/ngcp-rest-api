const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const configPath = path.resolve(__dirname, './tsconfig.jest.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
);

const baseOptions = {
    ...parsed.options,
    module: ts.ModuleKind.CommonJS,
    isolatedModules: true,
    outDir: undefined,
};

// cached output must change with this transformer and its tsconfig
const transformerHash = crypto.createHash('sha1')
    .update(fs.readFileSync(__filename))
    .update(fs.readFileSync(configPath))
    .digest('hex')

module.exports = {
    getCacheKey(sourceText, sourceFilePath, options) {
        return crypto.createHash('sha1')
            .update(transformerHash)
            .update(options.configString)
            .update(sourceFilePath)
            .update(sourceText)
            .digest('hex')
    },

    process(sourceText, sourceFilePath) {
        if (!/\.(ts|tsx|js|jsx)$/.test(sourceFilePath)) {
            return { code: sourceText }
        }

        // node_modules are transformed only for their ESM-only packages
        if (sourceFilePath.includes('/node_modules/') && !/^\s*(import|export)\b/m.test(sourceText)) {
            return { code: sourceText }
        }

        const isTypeScript = /\.tsx?$/.test(sourceFilePath)

        const result = ts.transpileModule(replaceImportMeta(sourceText), {
            compilerOptions: baseOptions,
            fileName: sourceFilePath,
            /*
            ...(isTypeScript && {
                transformers: {
                    before: [stripDecoratorTransformer()],
                },
            }),
            */
        })

        return {
            code: result.outputText,
            map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
        }
    },
}

// ESM-only packages are compiled to CommonJS, which has no import.meta
function replaceImportMeta(sourceText) {
    if (!sourceText.includes('import.meta'))
        return sourceText
    return sourceText
        // `const require = createRequire(import.meta.url)`: CommonJS has its own require
        .replace(/\b(const|let|var) require\s*=/g, '$1 esmCreatedRequire =')
        .replace(/import\.meta\.url\b/g, "require('url').pathToFileURL(__filename).href")
        .replace(/import\.meta\.dirname\b/g, '__dirname')
        .replace(/import\.meta\.filename\b/g, '__filename')
        .replace(/import\.meta\.resolve\(/g, "((s) => require('url').pathToFileURL(require.resolve(s)).href)(")
}

function stripDecoratorTransformer() {
    return (context) => (sourceFile) => {
        const visit = (node) => {
            if (ts.isClassDeclaration(node) || ts.isMethodDeclaration(node)) {
                node.decorators = undefined
            }
            return ts.visitEachChild(node, visit, context)
        }
        return ts.visitNode(sourceFile, visit);
    };
}
