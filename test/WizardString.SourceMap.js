const assert = require('node:assert')
const WizardString = require('../dist/wizard-string.cjs.js')

require('source-map-support').install()

describe('WizardString.SourceMap', () => {
   describe('options', () => {
      it('preserves ignore list information', () => {
         const map = new WizardString.SourceMap({
            file: 'foo.min.js',
            sources: ['foo.js'],
            sourcesContent: ['42'],
            names: [],
            mappings: [[0, 0]],
            x_google_ignoreList: [0],
         })

         assert.deepEqual(map.x_google_ignoreList, [0])
      })
   })

   describe('toString', () => {
      it('serializes ignore list information', () => {
         const map = new WizardString.SourceMap({
            file: 'foo.min.js',
            sources: ['foo.js'],
            sourcesContent: ['42'],
            names: [],
            mappings: [[0, 0]],
            x_google_ignoreList: [0],
         })

         assert.equal(map.toString(), '{"version":3,"file":"foo.min.js","sources":["foo.js"],"sourcesContent":["42"],"names":[],"mappings":"AAAAA,AAAAA","x_google_ignoreList":[0]}')
      })
   })
})
