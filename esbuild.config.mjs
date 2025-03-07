import esbuild from 'esbuild'
import process from 'process'
import builtins from 'builtin-modules'

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`

const prod = process.argv[2] === 'production'

const context = await esbuild.context({
  banner: {
    js: banner
  },
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    ...builtins
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  plugins: [
    {
      name: 'exclude-test-files',
      setup(build) {
        // Exclude test files and mocks from the build
        build.onResolve({ filter: /(__tests__|tests|__mocks__)/ }, (args) => {
          return { path: args.path, external: true }
        })

        build.onEnd(() => {
          console.log('Build complete!')
        })
      }
    }
  ]
})

if (prod) {
  await context.rebuild()
  process.exit(0)
} else {
  await context.watch()
}
