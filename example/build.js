/* eslint-disable prefer-const */
const fs = require('node:fs')
const WizardString = require('../')

process.chdir(__dirname)

fs.readFile('app.source.js', (err, result) => {
   let source
   let wizardString
   const pattern = /foo/g
   let match
   let transpiled
   let map

   if (err)
      throw err

   source = result.toString()
   wizardString = new WizardString(result.toString())

   while (match = pattern.exec(source))
      wizardString.overwrite(match.index, match.index + 3, 'answer')

   transpiled = `${wizardString.toString()}\n//# sourceMappingURL=app.js.map`
   map = wizardString.generateMap({
      file: 'app.js.map',
      source: 'app.source.js',
      includeContent: true,
      hires: true,
   })

   fs.writeFileSync('app.js', transpiled)
   fs.writeFileSync('app.js.map', map)

   fs.writeFileSync('app.inlinemap.js', `${transpiled}\n//#sourceMappingURL=${map.toUrl()}`)
})
