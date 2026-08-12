import { readFileSync }                    from 'node:fs'
import { basename }                        from 'node:path'
import { dirname }                         from 'node:path'
import { resolve }                         from 'node:path'
import { type Expression }                 from 'typescript/unstable/ast'
import { isArrayLiteralExpression }        from 'typescript/unstable/ast'
import { isClassDeclaration }              from 'typescript/unstable/ast'
import { isIdentifier }                    from 'typescript/unstable/ast'
import { isNoSubstitutionTemplateLiteral } from 'typescript/unstable/ast'
import { isNumericLiteral }                from 'typescript/unstable/ast'
import { isObjectLiteralExpression }       from 'typescript/unstable/ast'
import { isPropertyAssignment }            from 'typescript/unstable/ast'
import { isPropertyDeclaration }           from 'typescript/unstable/ast'
import { isStringLiteral }                 from 'typescript/unstable/ast'
import { type Node }                       from 'typescript/unstable/ast'
import { type PropertyName }               from 'typescript/unstable/ast'
import { type SourceFile }                 from 'typescript/unstable/ast'
import { SyntaxKind }                      from 'typescript/unstable/ast'
import { API } from 'typescript/unstable/sync'

export type PropertyDefaults<T extends object, K extends keyof T = keyof T> = Partial<Pick<T, K>>

function sourceFileName(file: string): string
{
	const sameDirectory = resolve(file.substring(0, file.lastIndexOf('.')) + '.ts')
	try {
		readFileSync(sameDirectory, 'utf8')
		return sameDirectory
	}
	catch {
		const fileName = basename(file)
		const source   = resolve(
			dirname(file),
			'../src/' + fileName.substring(0, fileName.lastIndexOf('.')) + '.ts'
		)
		readFileSync(source, 'utf8')
		return source
	}
}

function getPropertyName(name: PropertyName): string | undefined
{
	if (isIdentifier(name) || isStringLiteral(name) || isNumericLiteral(name)) {
		return name.text
	}
	return undefined
}

function parseLiteral(node: Expression): any
{
	if (node.kind === SyntaxKind.FalseKeyword) {
		return false
	}
	if (node.kind === SyntaxKind.NullKeyword) {
		return null
	}
	if (node.kind === SyntaxKind.TrueKeyword) {
		return true
	}
	if (isArrayLiteralExpression(node)) {
		return node.elements.map(parseLiteral)
	}
	if (isNumericLiteral(node)) {
		return Number(node.text)
	}
	if (isObjectLiteralExpression(node)) {
		const object: Record<string, any> = {}
		for (const property of node.properties) {
			if (isPropertyAssignment(property)) {
				const propertyName = getPropertyName(property.name)
				if (propertyName !== undefined) {
					object[propertyName] = parseLiteral(property.initializer)
				}
			}
		}
		return object
	}
	if (isNoSubstitutionTemplateLiteral(node) || isStringLiteral(node)) {
		return node.text
	}
	return undefined
}

function parseSourceFile<T extends object>(sourceFile: SourceFile): PropertyDefaults<T>
{
	const propertyDefaults = {} as PropertyDefaults<T>

	function parseNode(node: Node)
	{
		if (
			isClassDeclaration(node)
			&& node.name
			&& node.modifiers?.some(modifier => modifier.kind === SyntaxKind.ExportKeyword)
		) {
			for (const member of node.members) {
				if (!isPropertyDeclaration(member) || !member.initializer) continue
				const name = getPropertyName(member.name)
				if (!name) continue
				propertyDefaults[name as keyof T] = parseLiteral(member.initializer)
			}
			return
		}

		node.forEachChild(parseNode)
	}

	parseNode(sourceFile)
	return propertyDefaults
}

export function propertyDefaultsFromFile<T extends object>(file: string): PropertyDefaults<T>
{
	const source = sourceFileName(file)
	const api    = new API({ cwd: dirname(source) })
	try {
		const snapshot   = api.updateSnapshot({ openFiles: [source] })
		const project    = snapshot.getDefaultProjectForFile(source)
		const sourceFile = project?.program.getSourceFile(source)
		if (!sourceFile) {
			throw new Error('TypeScript could not parse source file: ' + source)
		}
		return parseSourceFile<T>(sourceFile)
	}
	finally {
		api.close()
	}
}
