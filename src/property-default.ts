import { readFileSync } from 'node:fs'
import { dirname }      from 'node:path'
import { basename }     from 'node:path'
import ts               from 'typescript'

export type PropertyDefaults = Record<string, any>

function fileContent(file: string)
{
	try {
		return readFileSync(file.substring(0, file.lastIndexOf('.')) + '.ts', 'utf8')
	}
	catch {
		const fileName = basename(file)
		return readFileSync(dirname(file) + '/../src/' + fileName.substring(0, fileName.lastIndexOf('.')) + '.ts', 'utf8')
	}
}

function parseLiteral(node: ts.Expression): any
{
	if (node.kind === ts.SyntaxKind.FalseKeyword) {
		return false
	}
	if (node.kind === ts.SyntaxKind.NullKeyword) {
		return null
	}
	if (node.kind === ts.SyntaxKind.TrueKeyword) {
		return true
	}
	if (ts.isArrayLiteralExpression(node)) {
		return node.elements.map(parseLiteral)
	}
	if (ts.isNumericLiteral(node)) {
		return Number(node.text)
	}
	if (ts.isObjectLiteralExpression(node)) {
		const object: Record<string, any> = {}
		for (const property of node.properties) {
			if (ts.isPropertyAssignment(property)) {
				const propertyName   = (property.name as ts.Identifier).text
				object[propertyName] = parseLiteral(property.initializer)
			}
		}
		return object
	}
	if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isStringLiteral(node)) {
		return node.text
	}
	return undefined
}

export function propertyDefaultsFromFile(file: string): PropertyDefaults
{
	const content         = fileContent(file)
	const propertyDefaults: PropertyDefaults = {}
	const sourceFile      = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)

	function parseNode(node: ts.Node)
	{
		if (
			ts.isClassDeclaration(node)
			&& node.name
			&& node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)
		) {
			for (const member of node.members) {
				if (ts.isPropertyDeclaration(member)) {
					const initializer = member.initializer ? parseLiteral(member.initializer) : undefined
					propertyDefaults[(member.name as ts.Identifier).text] = initializer
				}
			}
			return
		}

		ts.forEachChild(node, parseNode)
	}

	parseNode(sourceFile)
	return propertyDefaults
}
