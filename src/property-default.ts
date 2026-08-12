import { type Expression } from '@itrocks/ast'
import { parse }           from '@itrocks/ast'
import { readFileSync }    from 'node:fs'
import { basename }        from 'node:path'
import { dirname }         from 'node:path'
import { resolve }         from 'node:path'

export type PropertyDefaults<T extends object, K extends keyof T = keyof T> = Partial<Pick<T, K>>

function parseLiteral(node: Expression): any
{
	if (node.kind === 'literal') {
		return node.value
	}
	if (node.kind === 'array') {
		return node.elements.map(parseLiteral)
	}
	if (node.kind === 'object') {
		const object: Record<string, any> = {}
		for (const property of node.properties) {
			if (property.name !== undefined) {
				object[property.name] = parseLiteral(property.value)
			}
		}
		return object
	}
	return undefined
}

function parseSource<T extends object>(source: string, fileName: string): PropertyDefaults<T>
{
	const propertyDefaults = {} as PropertyDefaults<T>
	for (const declaration of parse(source, fileName).declarations) {
		if ((declaration.kind !== 'class') || !declaration.name || !declaration.exported) continue
		for (const member of declaration.members) {
			if ((member.kind !== 'property') || !member.initializer || !member.name) continue
			propertyDefaults[member.name as keyof T] = parseLiteral(member.initializer)
		}
	}
	return propertyDefaults
}

export function propertyDefaultsFromFile<T extends object>(file: string): PropertyDefaults<T>
{
	const source = sourceFileName(file)
	return parseSource<T>(readFileSync(source, 'utf8'), source)
}

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
