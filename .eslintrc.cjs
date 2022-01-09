module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
		browser: false,
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 'latest',
	},
	extends: ['prettier'],
	rules: {
		'no-unused-vars': ['warn', { vars: 'all', args: 'none' }],
		'no-constant-condition': ['error', { checkLoops: false }],
		eqeqeq: ['warn', 'always'],
	},
}
