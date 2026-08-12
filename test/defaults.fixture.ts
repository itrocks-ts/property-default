class InternalModel
{
	ignored = 'not exported'
}

export class Defaults
{
	text          = 'hello'
	template      = `world`
	empty         = ''
	integer       = 42
	decimal       = 12.5
	truth         = true
	lie           = false
	nothing       = null
	list          = ['one', 2, false, null, { deep: `value` }]
	object        = { text: 'value', 'quoted-key': 7, 8: true, nested: { enabled: false } }
	unsupported   = new Date()
	withoutValue?: string
	method() { return 'ignored' }
	[Symbol.iterator] = undefined
}
