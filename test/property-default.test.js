import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { propertyDefaultsFromFile } from '../cjs/property-default.js'

const fixture = name => fileURLToPath(new URL(name, import.meta.url))

test('reads every supported literal from an exported class', () => {
	assert.deepStrictEqual(propertyDefaultsFromFile(fixture('defaults.fixture.ts')), {
		text: 'hello',
		template: 'world',
		empty: '',
		integer: 42,
		decimal: 12.5,
		truth: true,
		lie: false,
		nothing: null,
		list: ['one', 2, false, null, { deep: 'value' }],
		object: { text: 'value', 'quoted-key': 7, 8: true, nested: { enabled: false } },
		unsupported: undefined
	})
})

test('combines defaults from named and default exported classes', () => {
	assert.deepStrictEqual(propertyDefaultsFromFile(fixture('classes.fixture.ts')), {
		first: 'one',
		second: 2
	})
})

test('accepts a source path relative to the current working directory', () => {
	assert.deepStrictEqual(propertyDefaultsFromFile('test/classes.fixture.ts'), {
		first: 'one',
		second: 2
	})
})

test('ignores non-exported classes, methods, uninitialized and computed properties', () => {
	const defaults = propertyDefaultsFromFile(fixture('defaults.fixture.ts'))

	assert.equal('ignored' in defaults, false)
	assert.equal('withoutValue' in defaults, false)
	assert.equal('method' in defaults, false)
	assert.equal(String(Symbol.iterator) in defaults, false)
})

test('locates src TypeScript when called with a compiled JavaScript path', () => {
	assert.deepStrictEqual(
		propertyDefaultsFromFile(fixture('cjs/model.fixture.js')),
		{ fromSource: 'fallback' }
	)
})

test('propagates a filesystem error when no TypeScript source exists', () => {
	assert.throws(
		() => propertyDefaultsFromFile(fixture('missing.fixture.js')),
		{ code: 'ENOENT' }
	)
})
