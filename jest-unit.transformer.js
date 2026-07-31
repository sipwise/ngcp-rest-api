const ts = require('typescript')
const path = require('path')

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
};

module.exports = {
    process(sourceText, sourceFilePath) {
        if (!/\.(ts|tsx|js|jsx)$/.test(sourceFilePath)) {
            return { code: sourceText }
        }

        const isTypeScript = /\.tsx?$/.test(sourceFilePath)

        const result = ts.transpileModule(sourceText, {
            compilerOptions: baseOptions,
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
