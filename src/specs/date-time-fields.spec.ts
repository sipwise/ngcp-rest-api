import {readFileSync, readdirSync} from 'fs'
import {join, relative} from 'path'

import * as ts from 'typescript'

const srcDir = join(__dirname, '..')
const fieldDecorators = [
    'DateTimeField',
    'LocalDateTimeField',
]

function dtoFiles(dir: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const path = join(dir, entry.name)
        if (entry.isDirectory())
            return dtoFiles(path)
        return entry.name.endsWith('.dto.ts') ? [path] : []
    })
}

function referencesDate(type: ts.TypeNode | undefined): boolean {
    if (!type)
        return false
    if (ts.isTypeReferenceNode(type) && type.typeName.getText() == 'Date')
        return true
    return type.getChildren().some(child => ts.isTypeNode(child) && referencesDate(child))
        || (ts.isUnionTypeNode(type) && type.types.some(referencesDate))
        || (ts.isArrayTypeNode(type) && referencesDate(type.elementType))
}

function decoratorName(decorator: ts.Decorator): string | undefined {
    const expression = decorator.expression
    return ts.isCallExpression(expression) ? expression.expression.getText() : expression.getText()
}

/**
 * DTO Date fields without @DateTimeField()/@LocalDateTimeField(), as `<file>: <Class>.<field>`
 */
function unmarkedDateFields(): string[] {
    const unmarked: string[] = []
    for (const file of dtoFiles(srcDir)) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
        source.forEachChild(function visit(node) {
            if (ts.isPropertyDeclaration(node) && referencesDate(node.type)) {
                const names = (ts.getDecorators(node) ?? []).map(decoratorName)
                if (!names.some(name => fieldDecorators.includes(name))) {
                    const className = ts.isClassLike(node.parent) ? node.parent.name?.getText() : '?'
                    unmarked.push(`${relative(srcDir, file)}: ${className}.${node.name.getText()}`)
                }
            }
            node.forEachChild(visit)
        })
    }
    return unmarked
}

describe('DTO date/time fields', () => {
    it('finds dto files', () => {
        expect(dtoFiles(srcDir).length).toBeGreaterThan(100)
    })

    it('marks every Date field with @DateTimeField() or @LocalDateTimeField()', () => {
        expect(unmarkedDateFields()).toEqual([])
    })
})
