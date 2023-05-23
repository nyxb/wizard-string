const assert = require('node:assert')
const SourceMapConsumer = require('source-map-js').SourceMapConsumer
const WizardString = require('./utils/IntegrityCheckingWizardString')

require('source-map-support').install()

describe('WizardString', () => {
   describe('options', () => {
      it('stores source file information', () => {
         const s = new WizardString('abc', {
            filename: 'foo.js',
         })

         assert.equal(s.filename, 'foo.js')
      })

      it('stores ignore-list hint', () => {
         const s = new WizardString('abc', { ignoreList: true })

         assert.equal(s.ignoreList, true)
      })
   })

   describe('append', () => {
      it('should append content', () => {
         const s = new WizardString('abcdefghijkl')

         s.append('xyz')
         assert.equal(s.toString(), 'abcdefghijklxyz')

         s.append('xyz')
         assert.equal(s.toString(), 'abcdefghijklxyzxyz')
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.append('xyz'), s)
      })

      it('should throw when given non-string content', () => {
         const s = new WizardString('')
         assert.throws(() => s.append([]), TypeError)
      })
   })

   describe('(ap|pre)pend(Left|Right)', () => {
      it('preserves intended order', () => {
         const s = new WizardString('0123456789')

         s.appendLeft(5, 'A')
         s.prependRight(5, 'a')
         s.prependRight(5, 'b')
         s.appendLeft(5, 'B')
         s.appendLeft(5, 'C')
         s.prependRight(5, 'c')

         assert.equal(s.toString(), '01234ABCcba56789')
         assert.equal(s.slice(0, 5), '01234ABC')
         assert.equal(s.slice(5), 'cba56789')

         s.prependLeft(5, '<')
         s.prependLeft(5, '{')
         assert.equal(s.toString(), '01234{<ABCcba56789')

         s.appendRight(5, '>')
         s.appendRight(5, '}')
         assert.equal(s.toString(), '01234{<ABCcba>}56789')

         s.appendLeft(5, '(')
         s.appendLeft(5, '[')
         assert.equal(s.toString(), '01234{<ABC([cba>}56789')

         s.prependRight(5, ')')
         s.prependRight(5, ']')
         assert.equal(s.toString(), '01234{<ABC([])cba>}56789')

         assert.equal(s.slice(0, 5), '01234{<ABC([')
         assert.equal(s.slice(5), '])cba>}56789')
      })

      it('preserves intended order at beginning of string', () => {
         const s = new WizardString('x')

         s.appendLeft(0, '1')
         s.prependLeft(0, '2')
         s.appendLeft(0, '3')
         s.prependLeft(0, '4')

         assert.equal(s.toString(), '4213x')
      })

      it('preserves intended order at end of string', () => {
         const s = new WizardString('x')

         s.appendRight(1, '1')
         s.prependRight(1, '2')
         s.appendRight(1, '3')
         s.prependRight(1, '4')

         assert.equal(s.toString(), 'x4213')
      })
   })

   describe('appendLeft', () => {
      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.appendLeft(0, 'a'), s)
      })
   })

   describe('appendRight', () => {
      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.appendRight(0, 'a'), s)
      })
   })

   describe('clone', () => {
      it('should clone a wizard string', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(3, 9, 'XYZ')
         const c = s.clone()

         assert.notEqual(s, c)
         assert.equal(c.toString(), 'abcXYZjkl')
      })

      it('should clone filename info', () => {
         const s = new WizardString('abcdefghijkl', { filename: 'foo.js' })
         const c = s.clone()

         assert.equal(c.filename, 'foo.js')
      })

      it('should clone indentExclusionRanges', () => {
         const array = [3, 6]
         const source = new WizardString('abcdefghijkl', {
            filename: 'foo.js',
            indentExclusionRanges: array,
         })

         const clone = source.clone()

         assert.notStrictEqual(source.indentExclusionRanges, clone.indentExclusionRanges)
         assert.deepEqual(source.indentExclusionRanges, clone.indentExclusionRanges)
      })

      it('should clone complex indentExclusionRanges', () => {
         const array = [[3, 6], [7, 9]]
         const source = new WizardString('abcdefghijkl', {
            filename: 'foo.js',
            indentExclusionRanges: array,
         })

         const clone = source.clone()

         assert.notStrictEqual(source.indentExclusionRanges, clone.indentExclusionRanges)
         assert.deepEqual(source.indentExclusionRanges, clone.indentExclusionRanges)
      })

      it('should clone sourcemapLocations', () => {
         const source = new WizardString('abcdefghijkl', {
            filename: 'foo.js',
         })

         source.addSourcemapLocation(3)

         const clone = source.clone()

         assert.notStrictEqual(source.sourcemapLocations, clone.sourcemapLocations)
         assert.deepEqual(source.sourcemapLocations, clone.sourcemapLocations)
      })

      it('should clone intro and outro', () => {
         const source = new WizardString('defghi')

         source.prepend('abc')
         source.append('jkl')

         const clone = source.clone()

         assert.equal(source.toString(), clone.toString())
      })
   })

   describe('generateMap', () => {
      it('should generate a sourcemap', () => {
         const s = new WizardString('abcdefghijkl').remove(3, 9)

         const map = s.generateMap({
            file: 'output.md',
            source: 'input.md',
            includeContent: true,
            hires: true,
         })

         assert.equal(map.version, 3)
         assert.equal(map.file, 'output.md')
         assert.deepEqual(map.sources, ['input.md'])
         assert.deepEqual(map.sourcesContent, ['abcdefghijkl'])
         assert.equal(map.mappings, 'AAAA,CAAC,CAAC,CAAO,CAAC,CAAC')

         assert.equal(map.toString(), '{"version":3,"file":"output.md","sources":["input.md"],"sourcesContent":["abcdefghijkl"],"names":[],"mappings":"AAAA,CAAC,CAAC,CAAO,CAAC,CAAC"}')
         assert.equal(map.toUrl(), 'data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Lm1kIiwic291cmNlcyI6WyJpbnB1dC5tZCJdLCJzb3VyY2VzQ29udGVudCI6WyJhYmNkZWZnaGlqa2wiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxDQUFDLENBQU8sQ0FBQyxDQUFDIn0=')

         const smc = new SourceMapConsumer(map)
         let loc

         loc = smc.originalPositionFor({ line: 1, column: 0 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 0)

         loc = smc.originalPositionFor({ line: 1, column: 1 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 1)

         loc = smc.originalPositionFor({ line: 1, column: 4 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 10)
      })

      it('should generate a correct sourcemap for prepend content when hires = false', () => {
         const s = new WizardString('x\nq')

         s.prepend('y\n')

         const map = s.generateMap({
            includeContent: true,
         })

         assert.equal(map.mappings, ';AAAA;AACA')
      })

      it('should generate a correct sourcemap for indented content', () => {
         const s = new WizardString('var answer = 42;\nconsole.log("the answer is %s", answer);')

         s.prepend('\'use strict\';\n\n')
         s.indent('\t').prepend('(function () {\n').append('\n}).call(global);')

         const map = s.generateMap({
            source: 'input.md',
            includeContent: true,
            hires: true,
         })

         const smc = new SourceMapConsumer(map)

         const originLoc = smc.originalPositionFor({ line: 5, column: 1 })
         assert.equal(originLoc.line, 2)
         assert.equal(originLoc.column, 0)
      })

      it('should generate a sourcemap using specified locations', () => {
         const s = new WizardString('abcdefghijkl')

         s.addSourcemapLocation(0)
         s.addSourcemapLocation(3)
         s.addSourcemapLocation(10)

         s.remove(6, 9)
         const map = s.generateMap({
            file: 'output.md',
            source: 'input.md',
            includeContent: true,
         })

         assert.equal(map.version, 3)
         assert.equal(map.file, 'output.md')
         assert.deepEqual(map.sources, ['input.md'])
         assert.deepEqual(map.sourcesContent, ['abcdefghijkl'])

         assert.equal(map.toString(), '{"version":3,"file":"output.md","sources":["input.md"],"sourcesContent":["abcdefghijkl"],"names":[],"mappings":"AAAA,GAAG,GAAM,CAAC"}')
         assert.equal(map.toUrl(), 'data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0Lm1kIiwic291cmNlcyI6WyJpbnB1dC5tZCJdLCJzb3VyY2VzQ29udGVudCI6WyJhYmNkZWZnaGlqa2wiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsR0FBRyxHQUFNLENBQUMifQ==')

         const smc = new SourceMapConsumer(map)
         let loc

         loc = smc.originalPositionFor({ line: 1, column: 0 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 0)

         loc = smc.originalPositionFor({ line: 1, column: 3 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 3)

         loc = smc.originalPositionFor({ line: 1, column: 7 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 10)
      })

      it('should correctly map inserted content', () => {
         const s = new WizardString('function Foo () {}')

         s.overwrite(9, 12, 'Bar')

         const map = s.generateMap({
            file: 'output.js',
            source: 'input.js',
            includeContent: true,
         })

         const smc = new SourceMapConsumer(map)

         const loc = smc.originalPositionFor({ line: 1, column: 9 })
         assert.equal(loc.line, 1)
         assert.equal(loc.column, 9)
      })

      it('should yield consistent results between appendLeft and prependRight', () => {
         const s1 = new WizardString('abcdefghijkl')
         s1.appendLeft(6, 'X')

         const s2 = new WizardString('abcdefghijkl')
         s2.prependRight(6, 'X')

         const m1 = s1.generateMap({ file: 'output', source: 'input', includeContent: true })
         const m2 = s2.generateMap({ file: 'output', source: 'input', includeContent: true })

         assert.deepEqual(m1, m2)
      })

      it('should recover original names', () => {
         const s = new WizardString('function Foo () {}')

         s.overwrite(9, 12, 'Bar', { storeName: true })

         const map = s.generateMap({
            file: 'output.js',
            source: 'input.js',
            includeContent: true,
         })

         const smc = new SourceMapConsumer(map)

         const loc = smc.originalPositionFor({ line: 1, column: 9 })
         assert.equal(loc.name, 'Foo')
      })

      it('should generate one segment per replacement', () => {
         const s = new WizardString('var answer = 42')
         s.overwrite(4, 10, 'number', { storeName: true })

         const map = s.generateMap({
            file: 'output.js',
            source: 'input.js',
            includeContent: true,
         })

         const smc = new SourceMapConsumer(map)

         let numMappings = 0
         smc.eachMapping(() => numMappings += 1)

         assert.equal(numMappings, 3) // one at 0, one at the edit, one afterwards
      })

      it('should generate a sourcemap that correctly locates moved content', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(3, 6, 9)

         const result = s.toString()
         const map = s.generateMap({
            file: 'output.js',
            source: 'input.js',
            includeContent: true,
            hires: true,
         })

         const smc = new SourceMapConsumer(map)

         'abcdefghijkl'.split('').forEach((letter, i) => {
            const column = result.indexOf(letter)
            const loc = smc.originalPositionFor({ line: 1, column })

            assert.equal(loc.line, 1)
            assert.equal(loc.column, i)
         })
      })

      it('generates a map with trimmed content (#53)', () => {
         const s1 = new WizardString('abcdefghijkl ').trim()
         const map1 = s1.generateMap({
            file: 'output',
            source: 'input',
            includeContent: true,
            hires: true,
         })

         const smc1 = new SourceMapConsumer(map1)
         const loc1 = smc1.originalPositionFor({ line: 1, column: 11 })

         assert.equal(loc1.column, 11)

         const s2 = new WizardString(' abcdefghijkl').trim()
         const map2 = s2.generateMap({
            file: 'output',
            source: 'input',
            includeContent: true,
            hires: true,
         })

         const smc2 = new SourceMapConsumer(map2)
         const loc2 = smc2.originalPositionFor({ line: 1, column: 1 })

         assert.equal(loc2.column, 2)
      })

      it('skips empty segments at the start', () => {
         const s = new WizardString('abcdefghijkl')
         s.remove(0, 3).remove(3, 6)

         const map = s.generateMap()
         const smc = new SourceMapConsumer(map)
         const loc = smc.originalPositionFor({ line: 1, column: 6 })

         assert.equal(loc.column, 6)
      })

      it('skips indentation at the start', () => {
         const s = new WizardString('abcdefghijkl')
         s.indent('    ')

         const map = s.generateMap()
         assert.equal(map.mappings, 'IAAA')
      })

      it('generates x_google_ignoreList', () => {
         const s = new WizardString('function foo(){}', {
            ignoreList: true,
         })

         const map = s.generateMap({ source: 'foo.js' })
         assert.deepEqual(map.sources, ['foo.js'])
         assert.deepEqual(map.x_google_ignoreList, [0])
      })
   })

   describe('getIndentString', () => {
      it('should guess the indent string', () => {
         const s = new WizardString('abc\n  def\nghi')
         assert.equal(s.getIndentString(), '  ')
      })

      it('should return a tab if no lines are indented', () => {
         const s = new WizardString('abc\ndef\nghi')
         assert.equal(s.getIndentString(), '\t')
      })
   })

   describe('indent', () => {
      it('should indent content with a single tab character by default', () => {
         const s = new WizardString('abc\ndef\nghi\njkl')

         s.indent()
         assert.equal(s.toString(), '\tabc\n\tdef\n\tghi\n\tjkl')

         s.indent()
         assert.equal(s.toString(), '\t\tabc\n\t\tdef\n\t\tghi\n\t\tjkl')
      })

      it('should indent content, using existing indentation as a guide', () => {
         const s = new WizardString('abc\n  def\n    ghi\n  jkl')

         s.indent()
         assert.equal(s.toString(), '  abc\n    def\n      ghi\n    jkl')

         s.indent()
         assert.equal(s.toString(), '    abc\n      def\n        ghi\n      jkl')
      })

      it('should disregard single-space indentation when auto-indenting', () => {
         const s = new WizardString('abc\n/**\n *comment\n */')

         s.indent()
         assert.equal(s.toString(), '\tabc\n\t/**\n\t *comment\n\t */')
      })

      it('should indent content using the supplied indent string', () => {
         const s = new WizardString('abc\ndef\nghi\njkl')

         s.indent('  ')
         assert.equal(s.toString(), '  abc\n  def\n  ghi\n  jkl')

         s.indent('>>')
         assert.equal(s.toString(), '>>  abc\n>>  def\n>>  ghi\n>>  jkl')
      })

      it('should indent content using the empty string if specified (i.e. noop)', () => {
         const s = new WizardString('abc\ndef\nghi\njkl')

         s.indent('')
         assert.equal(s.toString(), 'abc\ndef\nghi\njkl')
      })

      it('should prevent excluded characters from being indented', () => {
         const s = new WizardString('abc\ndef\nghi\njkl')

         s.indent('  ', { exclude: [7, 15] })
         assert.equal(s.toString(), '  abc\n  def\nghi\njkl')

         s.indent('>>', { exclude: [7, 15] })
         assert.equal(s.toString(), '>>  abc\n>>  def\nghi\njkl')
      })

      it('should not add characters to empty lines', () => {
         const s = new WizardString('\n\nabc\ndef\n\nghi\njkl')

         s.indent()
         assert.equal(s.toString(), '\n\n\tabc\n\tdef\n\n\tghi\n\tjkl')

         s.indent()
         assert.equal(s.toString(), '\n\n\t\tabc\n\t\tdef\n\n\t\tghi\n\t\tjkl')
      })

      it('should not add characters to empty lines, even on Windows', () => {
         const s = new WizardString('\r\n\r\nabc\r\ndef\r\n\r\nghi\r\njkl')

         s.indent()
         assert.equal(s.toString(), '\r\n\r\n\tabc\r\n\tdef\r\n\r\n\tghi\r\n\tjkl')

         s.indent()
         assert.equal(s.toString(), '\r\n\r\n\t\tabc\r\n\t\tdef\r\n\r\n\t\tghi\r\n\t\tjkl')
      })

      it('should indent content with removals', () => {
         const s = new WizardString('/* remove this line */\nvar foo = 1;')

         s.remove(0, 23)
         s.indent()

         assert.equal(s.toString(), '\tvar foo = 1;')
      })

      it('should not indent patches in the middle of a line', () => {
         const s = new WizardString('class Foo extends Bar {}')

         s.overwrite(18, 21, 'Baz')
         assert.equal(s.toString(), 'class Foo extends Baz {}')

         s.indent()
         assert.equal(s.toString(), '\tclass Foo extends Baz {}')
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.indent(), s)
      })

      it('should return this on noop', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.indent(''), s)
      })
   })

   describe('insert', () => {
      it('is deprecated', () => {
         const s = new WizardString('abcdefghijkl')
         assert.throws(() => s.insert(6, 'X'), /deprecated/)
      })

      // TODO move this into prependRight and appendLeft tests

      // it( 'should insert characters in the correct location', () => {
      //    const s = new WizardString( 'abcdefghijkl' );
      //
      //    s.insert( 0, '>>>' );
      //    s.insert( 6, '***' );
      //    s.insert( 12, '<<<' );
      //
      //    assert.equal( s.toString(), '>>>abcdef***ghijkl<<<' );
      // });
      //
      // it( 'should return this', () => {
      //    const s = new WizardString( 'abcdefghijkl' );
      //    assert.strictEqual( s.insert( 0, 'a' ), s );
      // });
      //
      // it( 'should insert repeatedly at the same position correctly', () => {
      //    const s = new WizardString( 'ab' );
      //    assert.equal( s.insert(1, '1').toString(), 'a1b' );
      //    assert.equal( s.insert(1, '2').toString(), 'a12b' );
      // });
      //
      // it( 'should insert repeatedly at the beginning correctly', () => {
      //    const s = new WizardString( 'ab' );
      //    assert.equal( s.insert(0, '1').toString(), '1ab' );
      //    assert.equal( s.insert(0, '2').toString(), '12ab' );
      // });
      //
      // it( 'should throw when given non-string content', () => {
      //    const s = new WizardString( '' );
      //    assert.throws(
      //       function () { s.insert( 0, [] ); },
      //       TypeError
      //    );
      // });
      //
      // it( 'should allow inserting after removed range', () => {
      //    const s = new WizardString( 'abcd' );
      //    s.remove( 1, 2 );
      //    s.insert( 2, 'z' );
      //    assert.equal( s.toString(), 'azcd' );
      // });
   })

   describe('move', () => {
      it('moves content from the start', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(0, 3, 6)

         assert.equal(s.toString(), 'defabcghijkl')
      })

      it('moves content to the start', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(3, 6, 0)

         assert.equal(s.toString(), 'defabcghijkl')
      })

      it('moves content from the end', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(9, 12, 6)

         assert.equal(s.toString(), 'abcdefjklghi')
      })

      it('moves content to the end', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(6, 9, 12)

         assert.equal(s.toString(), 'abcdefjklghi')
      })

      it('ignores redundant move', () => {
         const s = new WizardString('abcdefghijkl')
         s.prependRight(9, 'X')
         s.move(9, 12, 6)
         s.appendLeft(12, 'Y')
         s.move(6, 9, 12) // this is redundant – [6,9] is already after [9,12]

         assert.equal(s.toString(), 'abcdefXjklYghi')
      })

      it('moves content to the middle', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(3, 6, 9)

         assert.equal(s.toString(), 'abcghidefjkl')
      })

      it('handles multiple moves of the same snippet', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(0, 3, 6)
         assert.equal(s.toString(), 'defabcghijkl')

         s.move(0, 3, 9)
         assert.equal(s.toString(), 'defghiabcjkl')
      })

      it('handles moves of adjacent snippets', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(0, 2, 6)
         assert.equal(s.toString(), 'cdefabghijkl')

         s.move(2, 4, 6)
         assert.equal(s.toString(), 'efabcdghijkl')
      })

      it('handles moves to same index', () => {
         const s = new WizardString('abcdefghijkl')
         s.move(0, 2, 6).move(3, 5, 6)

         assert.equal(s.toString(), 'cfabdeghijkl')
      })

      it('refuses to move a selection to inside itself', () => {
         const s = new WizardString('abcdefghijkl')

         assert.throws(() => s.move(3, 6, 3), /Cannot move a selection inside itself/)

         assert.throws(() => s.move(3, 6, 4), /Cannot move a selection inside itself/)

         assert.throws(() => s.move(3, 6, 6), /Cannot move a selection inside itself/)
      })

      it('allows edits of moved content', () => {
         const s1 = new WizardString('abcdefghijkl')

         s1.move(3, 6, 9)
         s1.overwrite(3, 6, 'DEF')

         assert.equal(s1.toString(), 'abcghiDEFjkl')

         const s2 = new WizardString('abcdefghijkl')

         s2.move(3, 6, 9)
         s2.overwrite(4, 5, 'E')

         assert.equal(s2.toString(), 'abcghidEfjkl')
      })

      // it( 'move follows inserts', () => {
      //    const s = new WizardString( 'abcdefghijkl' );
      //
      //    s.appendLeft( 3, 'X' ).move( 6, 9, 3 );
      //    assert.equal( s.toString(), 'abcXghidefjkl' );
      // });
      //
      // it( 'inserts follow move', () => {
      //    const s = new WizardString( 'abcdefghijkl' );
      //
      //    s.insert( 3, 'X' ).move( 6, 9, 3 ).insert( 3, 'Y' );
      //    assert.equal( s.toString(), 'abcXghiYdefjkl' );
      // });
      //
      // it( 'discards inserts at end of move by default', () => {
      //    const s = new WizardString( 'abcdefghijkl' );
      //
      //    s.insert( 6, 'X' ).move( 3, 6, 9 );
      //    assert.equal( s.toString(), 'abcXghidefjkl' );
      // });

      it('moves content inserted at end of range', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(6, 'X').move(3, 6, 9)
         assert.equal(s.toString(), 'abcghidefXjkl')
      })

      it('returns this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.move(3, 6, 9), s)
      })
   })

   describe('overwrite', () => {
      it('should replace characters', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(5, 8, 'FGH')
         assert.equal(s.toString(), 'abcdeFGHijkl')
      })

      it('should throw an error if overlapping replacements are attempted', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(7, 11, 'xx')

         assert.throws(() => s.overwrite(8, 12, 'yy'), /Cannot split a chunk that has already been edited/)

         assert.equal(s.toString(), 'abcdefgxxl')

         s.overwrite(6, 12, 'yes')
         assert.equal(s.toString(), 'abcdefyes')
      })

      it('should allow contiguous but non-overlapping replacements', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(3, 6, 'DEF')
         assert.equal(s.toString(), 'abcDEFghijkl')

         s.overwrite(6, 9, 'GHI')
         assert.equal(s.toString(), 'abcDEFGHIjkl')

         s.overwrite(0, 3, 'ABC')
         assert.equal(s.toString(), 'ABCDEFGHIjkl')

         s.overwrite(9, 12, 'JKL')
         assert.equal(s.toString(), 'ABCDEFGHIJKL')
      })

      it('does not replace zero-length inserts at overwrite start location', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(0, 6)
         s.appendLeft(6, 'DEF')
         s.overwrite(6, 9, 'GHI')
         assert.equal(s.toString(), 'DEFGHIjkl')
      })

      it('replaces zero-length inserts inside overwrite', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(6, 'XXX')
         s.overwrite(3, 9, 'DEFGHI')
         assert.equal(s.toString(), 'abcDEFGHIjkl')
      })

      it('replaces non-zero-length inserts inside overwrite', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(3, 4, 'XXX')
         s.overwrite(3, 5, 'DE')
         assert.equal(s.toString(), 'abcDEfghijkl')

         s.overwrite(7, 8, 'YYY')
         s.overwrite(6, 8, 'GH')
         assert.equal(s.toString(), 'abcDEfGHijkl')
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.overwrite(3, 4, 'D'), s)
      })

      it('should disallow overwriting zero-length ranges', () => {
         const s = new WizardString('x')
         assert.throws(() => s.overwrite(0, 0, 'anything'), /Cannot overwrite a zero-length range – use appendLeft or prependRight instead/)
      })

      it('should throw when given non-string content', () => {
         const s = new WizardString('')
         assert.throws(() => s.overwrite(0, 1, []), TypeError)
      })

      it('replaces interior inserts', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(1, '&')
         s.prependRight(1, '^')
         s.appendLeft(3, '!')
         s.prependRight(3, '?')
         s.overwrite(1, 3, '...')
         assert.equal(s.toString(), 'a&...?defghijkl')
      })

      it('preserves interior inserts with `contentOnly: true`', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(1, '&')
         s.prependRight(1, '^')
         s.appendLeft(3, '!')
         s.prependRight(3, '?')
         s.overwrite(1, 3, '...', { contentOnly: true })
         assert.equal(s.toString(), 'a&^...!?defghijkl')
      })

      it('disallows overwriting partially overlapping moved content', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         assert.throws(() => s.overwrite(5, 7, 'XX'), /Cannot overwrite across a split point/)
      })

      it('disallows overwriting fully surrounding content moved away', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         assert.throws(() => s.overwrite(4, 11, 'XX'), /Cannot overwrite across a split point/)
      })

      it('disallows overwriting fully surrounding content moved away even if there is another split', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         s.appendLeft(5, 'foo')
         assert.throws(() => s.overwrite(4, 11, 'XX'), /Cannot overwrite across a split point/)
      })

      it('allows later insertions at the end', () => {
         const s = new WizardString('abcdefg')

         s.appendLeft(4, '(')
         s.overwrite(2, 7, '')
         s.appendLeft(7, 'h')
         assert.equal(s.toString(), 'abh')
      })
   })

   describe('update', () => {
      it('should replace characters', () => {
         const s = new WizardString('abcdefghijkl')

         s.update(5, 8, 'FGH')
         assert.equal(s.toString(), 'abcdeFGHijkl')
      })

      it('should throw an error if overlapping replacements are attempted', () => {
         const s = new WizardString('abcdefghijkl')

         s.update(7, 11, 'xx')

         assert.throws(() => s.update(8, 12, 'yy'), /Cannot split a chunk that has already been edited/)

         assert.equal(s.toString(), 'abcdefgxxl')

         s.update(6, 12, 'yes')
         assert.equal(s.toString(), 'abcdefyes')
      })

      it('should allow contiguous but non-overlapping replacements', () => {
         const s = new WizardString('abcdefghijkl')

         s.update(3, 6, 'DEF')
         assert.equal(s.toString(), 'abcDEFghijkl')

         s.update(6, 9, 'GHI')
         assert.equal(s.toString(), 'abcDEFGHIjkl')

         s.update(0, 3, 'ABC')
         assert.equal(s.toString(), 'ABCDEFGHIjkl')

         s.update(9, 12, 'JKL')
         assert.equal(s.toString(), 'ABCDEFGHIJKL')
      })

      it('does not replace zero-length inserts at update start location', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(0, 6)
         s.appendLeft(6, 'DEF')
         s.update(6, 9, 'GHI')
         assert.equal(s.toString(), 'DEFGHIjkl')
      })

      it('replaces zero-length inserts inside update with overwrite option', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(6, 'XXX')
         s.update(3, 9, 'DEFGHI', { overwrite: true })
         assert.equal(s.toString(), 'abcDEFGHIjkl')
      })

      it('replaces non-zero-length inserts inside update', () => {
         const s = new WizardString('abcdefghijkl')

         s.update(3, 4, 'XXX')
         s.update(3, 5, 'DE')
         assert.equal(s.toString(), 'abcDEfghijkl')

         s.update(7, 8, 'YYY')
         s.update(6, 8, 'GH')
         assert.equal(s.toString(), 'abcDEfGHijkl')
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.update(3, 4, 'D'), s)
      })

      it('should disallow updating zero-length ranges', () => {
         const s = new WizardString('x')
         assert.throws(() => s.update(0, 0, 'anything'), /Cannot overwrite a zero-length range – use appendLeft or prependRight instead/)
      })

      it('should throw when given non-string content', () => {
         const s = new WizardString('')
         assert.throws(() => s.update(0, 1, []), TypeError)
      })

      it('replaces interior inserts with overwrite option', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(1, '&')
         s.prependRight(1, '^')
         s.appendLeft(3, '!')
         s.prependRight(3, '?')
         s.update(1, 3, '...', { overwrite: true })
         assert.equal(s.toString(), 'a&...?defghijkl')
      })

      it('preserves interior inserts with `contentOnly: true`', () => {
         const s = new WizardString('abcdefghijkl')

         s.appendLeft(1, '&')
         s.prependRight(1, '^')
         s.appendLeft(3, '!')
         s.prependRight(3, '?')
         s.update(1, 3, '...', { contentOnly: true })
         assert.equal(s.toString(), 'a&^...!?defghijkl')
      })

      it('disallows overwriting partially overlapping moved content', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         assert.throws(() => s.update(5, 7, 'XX'), /Cannot overwrite across a split point/)
      })

      it('disallows overwriting fully surrounding content moved away', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         assert.throws(() => s.update(4, 11, 'XX'), /Cannot overwrite across a split point/)
      })

      it('disallows overwriting fully surrounding content moved away even if there is another split', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         s.appendLeft(5, 'foo')
         assert.throws(() => s.update(4, 11, 'XX'), /Cannot overwrite across a split point/)
      })

      it('allows later insertions at the end with overwrite option', () => {
         const s = new WizardString('abcdefg')

         s.appendLeft(4, '(')
         s.update(2, 7, '', { overwrite: true })
         s.appendLeft(7, 'h')
         assert.equal(s.toString(), 'abh')
      })
   })

   describe('prepend', () => {
      it('should prepend content', () => {
         const s = new WizardString('abcdefghijkl')

         s.prepend('xyz')
         assert.equal(s.toString(), 'xyzabcdefghijkl')

         s.prepend('123')
         assert.equal(s.toString(), '123xyzabcdefghijkl')
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.prepend('xyz'), s)
      })
   })

   describe('prependLeft', () => {
      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.prependLeft(0, 'a'), s)
      })
   })

   describe('prependRight', () => {
      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.prependRight(0, 'a'), s)
      })
   })

   describe('remove', () => {
      it('should remove characters from the original string', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(1, 5)
         assert.equal(s.toString(), 'afghijkl')

         s.remove(9, 12)
         assert.equal(s.toString(), 'afghi')
      })

      it('should remove from the start', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(0, 6)
         assert.equal(s.toString(), 'ghijkl')
      })

      it('should remove from the end', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(6, 12)
         assert.equal(s.toString(), 'abcdef')
      })

      it('should treat zero-length removals as a no-op', () => {
         const s = new WizardString('abcdefghijkl')

         s.remove(0, 0).remove(6, 6).remove(9, -3)
         assert.equal(s.toString(), 'abcdefghijkl')
      })

      it('should remove overlapping ranges', () => {
         const s1 = new WizardString('abcdefghijkl')

         s1.remove(3, 7).remove(5, 9)
         assert.equal(s1.toString(), 'abcjkl')

         const s2 = new WizardString('abcdefghijkl')

         s2.remove(3, 7).remove(4, 6)
         assert.equal(s2.toString(), 'abchijkl')
      })

      it('should remove overlapping ranges, redux', () => {
         const s = new WizardString('abccde')

         s.remove(2, 3) // c
         s.remove(1, 3) // bc
         assert.equal(s.toString(), 'acde')
      })

      it('should remove modified ranges', () => {
         const s = new WizardString('abcdefghi')

         s.overwrite(3, 6, 'DEF')
         s.remove(2, 7) // cDEFg
         assert.equal(s.slice(1, 8), 'bh')
         assert.equal(s.toString(), 'abhi')
      })

      it('should not remove content inserted after the end of removed range', () => {
         const s = new WizardString('ab.c;')

         s.prependRight(0, '(')
         s.prependRight(4, ')')
         s.remove(2, 4)
         assert.equal(s.toString(), '(ab);')
      })

      it('should remove interior inserts', () => {
         const s = new WizardString('abc;')

         s.appendLeft(1, '[')
         s.prependRight(1, '(')
         s.appendLeft(2, ')')
         s.prependRight(2, ']')
         s.remove(1, 2)
         assert.equal(s.toString(), 'a[]c;')
      })

      it('should provide a useful error when illegal removals are attempted', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(5, 7, 'XX')

         assert.throws(() => s.remove(4, 6), /Cannot split a chunk that has already been edited/)
      })

      it('should return this', () => {
         const s = new WizardString('abcdefghijkl')
         assert.strictEqual(s.remove(3, 4), s)
      })

      it('removes across moved content', () => {
         const s = new WizardString('abcdefghijkl')

         s.move(6, 9, 3)
         s.remove(5, 7)

         assert.equal(s.toString(), 'abchidejkl')
      })
   })

   describe('slice', () => {
      it('should return the generated content between the specified original characters', () => {
         const s = new WizardString('abcdefghijkl')

         assert.equal(s.slice(3, 9), 'defghi')
         s.overwrite(4, 8, 'XX')
         assert.equal(s.slice(3, 9), 'dXXi')
         s.overwrite(2, 10, 'ZZ')
         assert.equal(s.slice(1, 11), 'bZZk')
         assert.equal(s.slice(2, 10), 'ZZ')

         assert.throws(() => s.slice(3, 9))
      })

      it('defaults `end` to the original string length', () => {
         const s = new WizardString('abcdefghijkl')
         assert.equal(s.slice(3), 'defghijkl')
      })

      it('allows negative numbers as arguments', () => {
         const s = new WizardString('abcdefghijkl')
         assert.equal(s.slice(-3), 'jkl')
         assert.equal(s.slice(0, -3), 'abcdefghi')
      })

      it('includes inserted characters, respecting insertion direction', () => {
         const s = new WizardString('abefij')

         s.prependRight(2, 'cd')
         s.appendLeft(4, 'gh')

         assert.equal(s.slice(), 'abcdefghij')
         assert.equal(s.slice(1, 5), 'bcdefghi')
         assert.equal(s.slice(2, 4), 'cdefgh')
         assert.equal(s.slice(3, 4), 'fgh')
         assert.equal(s.slice(0, 2), 'ab')
         assert.equal(s.slice(0, 3), 'abcde')
         assert.equal(s.slice(4, 6), 'ij')
         assert.equal(s.slice(3, 6), 'fghij')
      })

      it('supports characters moved outward', () => {
         const s = new WizardString('abcdEFghIJklmn')

         s.move(4, 6, 2)
         s.move(8, 10, 12)
         assert.equal(s.toString(), 'abEFcdghklIJmn')

         assert.equal(s.slice(1, -1), 'bEFcdghklIJm')
         assert.equal(s.slice(2, -2), 'cdghkl')
         assert.equal(s.slice(3, -3), 'dghk')
         assert.equal(s.slice(4, -4), 'EFcdghklIJ')
         assert.equal(s.slice(5, -5), 'FcdghklI')
         assert.equal(s.slice(6, -6), 'gh')
      })

      it('supports characters moved inward', () => {
         const s = new WizardString('abCDefghijKLmn')

         s.move(2, 4, 6)
         s.move(10, 12, 8)
         assert.equal(s.toString(), 'abefCDghKLijmn')

         assert.equal(s.slice(1, -1), 'befCDghKLijm')
         assert.equal(s.slice(2, -2), 'CDghKL')
         assert.equal(s.slice(3, -3), 'DghK')
         assert.equal(s.slice(4, -4), 'efCDghKLij')
         assert.equal(s.slice(5, -5), 'fCDghKLi')
         assert.equal(s.slice(6, -6), 'gh')
      })

      it('supports characters moved opposing', () => {
         const s = new WizardString('abCDefghIJkl')

         s.move(2, 4, 8)
         s.move(8, 10, 4)
         assert.equal(s.toString(), 'abIJefghCDkl')

         assert.equal(s.slice(1, -1), 'bIJefghCDk')
         assert.equal(s.slice(2, -2), '')
         assert.equal(s.slice(3, -3), '')
         assert.equal(s.slice(-3, 3), 'JefghC')
         assert.equal(s.slice(4, -4), 'efgh')
         assert.equal(s.slice(0, 3), 'abIJefghC')
         assert.equal(s.slice(3), 'Dkl')
         assert.equal(s.slice(0, -3), 'abI')
         assert.equal(s.slice(-3), 'JefghCDkl')
      })

      it('errors if replaced characters are used as slice anchors', () => {
         const s = new WizardString('abcdef')
         s.overwrite(2, 4, 'CD')

         assert.throws(() => s.slice(2, 3), /slice end anchor/)

         assert.throws(() => s.slice(3, 4), /slice start anchor/)

         assert.throws(() => s.slice(3, 5), /slice start anchor/)

         assert.equal(s.slice(1, 5), 'bCDe')
      })

      it('does not error if slice is after removed characters', () => {
         const s = new WizardString('abcdef')

         s.remove(0, 2)

         assert.equal(s.slice(2, 4), 'cd')
      })
   })

   describe('snip', () => {
      it('should return a clone with content outside `start` and `end` removed', () => {
         const s = new WizardString('abcdefghijkl', {
            filename: 'foo.js',
         })

         s.overwrite(6, 9, 'GHI')

         const snippet = s.snip(3, 9)
         assert.equal(snippet.toString(), 'defGHI')
         assert.equal(snippet.filename, 'foo.js')
      })

      it('should snip from the start', () => {
         const s = new WizardString('abcdefghijkl')
         const snippet = s.snip(0, 6)

         assert.equal(snippet.toString(), 'abcdef')
      })

      it('should snip from the end', () => {
         const s = new WizardString('abcdefghijkl')
         const snippet = s.snip(6, 12)

         assert.equal(snippet.toString(), 'ghijkl')
      })

      it('should respect original indices', () => {
         const s = new WizardString('abcdefghijkl')
         const snippet = s.snip(3, 9)

         snippet.overwrite(6, 9, 'GHI')
         assert.equal(snippet.toString(), 'defGHI')
      })
   })

   describe('trim', () => {
      it('should trim original content', () => {
         assert.equal(new WizardString('   abcdefghijkl   ').trim().toString(), 'abcdefghijkl')
         assert.equal(new WizardString('   abcdefghijkl').trim().toString(), 'abcdefghijkl')
         assert.equal(new WizardString('abcdefghijkl   ').trim().toString(), 'abcdefghijkl')
      })

      it('should trim replaced content', () => {
         const s = new WizardString('abcdefghijkl')

         s.overwrite(0, 3, '   ').overwrite(9, 12, '   ').trim()
         assert.equal(s.toString(), 'defghi')
      })

      it('should trim original content before replaced content', () => {
         const s = new WizardString('abc   def')

         s.remove(6, 9)
         assert.equal(s.toString(), 'abc   ')

         s.trim()
         assert.equal(s.toString(), 'abc')
      })

      it('should trim original content after replaced content', () => {
         const s = new WizardString('abc   def')

         s.remove(0, 3)
         assert.equal(s.toString(), '   def')

         s.trim()
         assert.equal(s.toString(), 'def')
      })

      it('should trim original content before and after replaced content', () => {
         const s = new WizardString('abc   def   ghi')

         s.remove(0, 3)
         s.remove(12, 15)
         assert.equal(s.toString(), '   def   ')

         s.trim()
         assert.equal(s.toString(), 'def')
      })

      it('should trim appended/prepended content', () => {
         const s = new WizardString(' abcdefghijkl ')

         s.prepend('  ').append('  ').trim()
         assert.equal(s.toString(), 'abcdefghijkl')
      })

      it('should trim empty string', () => {
         const s = new WizardString('   ')

         assert.equal(s.trim().toString(), '')
      })

      it('should return this', () => {
         const s = new WizardString('  abcdefghijkl  ')
         assert.strictEqual(s.trim(), s)
      })

      it('should support trimming chunks with intro and outro', () => {
         const s = new WizardString('    \n')
         s.appendRight(4, 'test')
         assert.strictEqual(s.trim().toString(), 'test')
      })
   })

   describe('trimLines', () => {
      it('should trim original content', () => {
         const s = new WizardString('\n\n   abcdefghijkl   \n\n')

         s.trimLines()
         assert.equal(s.toString(), '   abcdefghijkl   ')
      })
   })

   describe('isEmpty', () => {
      it('should support isEmpty', () => {
         const s = new WizardString(' abcde   fghijkl ')

         assert.equal(s.isEmpty(), false)

         s.prepend('  ')
         s.append('  ')
         s.remove(1, 6)
         s.remove(9, 15)

         assert.equal(s.isEmpty(), false)

         s.remove(15, 16)

         assert.equal(s.isEmpty(), true)
      })
   })

   describe('length', () => {
      it('should support length', () => {
         const s = new WizardString(' abcde   fghijkl ')

         assert.equal(s.length(), 17)

         s.prepend('  ')
         s.append('  ')
         s.remove(1, 6)
         s.remove(9, 15)

         assert.equal(s.length(), 6)

         s.remove(15, 16)

         assert.equal(s.length(), 5)
      })
   })

   describe('lastLine', () => {
      it('should support lastLine', () => {
         const s = new WizardString(' abcde\nfghijkl ')

         assert.equal(s.lastLine(), 'fghijkl ')

         s.prepend('  ')
         s.append('  ')
         s.remove(1, 6)
         s.remove(9, 15)

         assert.equal(s.lastLine(), 'fg  ')

         s.overwrite(7, 8, '\n')

         assert.equal(s.lastLine(), 'g  ')

         s.append('\n//lastline')

         assert.equal(s.lastLine(), '//lastline')
      })
   })

   describe('hasChanged', () => {
      it('should works', () => {
         const s = new WizardString(' abcde   fghijkl ')

         assert.ok(!s.hasChanged())

         assert.ok(s.clone().prepend('  ').hasChanged())
         assert.ok(s.clone().overwrite(1, 2, 'b').hasChanged())
         assert.ok(s.clone().remove(1, 6).hasChanged())

         s.trim()

         assert.ok(s.hasChanged())

         const clone = s.clone()

         assert.ok(clone.hasChanged())
      })
   })

   describe('replace', () => {
      it('works with string replace', () => {
         const code = '1 2 1 2'
         const s = new WizardString(code)

         s.replace('2', '3')

         assert.strictEqual(s.toString(), '1 3 1 2')
      })

      it('Should not treat string as regexp', () => {
         assert.strictEqual(
            new WizardString('1234').replace('.', '*').toString(),
            '1234',
         )
      })

      it('Should use substitution directly', () => {
         assert.strictEqual(
            new WizardString('11').replace('1', '$0$1').toString(),
            '$0$11',
         )
      })

      it('Should not search back', () => {
         assert.strictEqual(
            new WizardString('122121').replace('12', '21').toString(),
            '212121',
         )
      })

      it('works with global regex replace', () => {
         const s = new WizardString('1 2 3 4 a b c')

         s.replace(/(\d)/g, 'xx$1$10')

         assert.strictEqual(s.toString(), 'xx1$10 xx2$10 xx3$10 xx4$10 a b c')
      })

      it('works with global regex replace $$', () => {
         const s = new WizardString('1 2 3 4 a b c')

         s.replace(/(\d)/g, '$$')

         assert.strictEqual(s.toString(), '$ $ $ $ a b c')
      })

      it('works with global regex replace function', () => {
         const code = 'hey this is wizard'
         const s = new WizardString(code)

         s.replace(/(\w)(\w+)/g, (_, $1, $2) => `${$1.toUpperCase()}${$2}`)

         assert.strictEqual(s.toString(), 'Hey This Is Magic')
      })

      it('replace function offset', () => {
         // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_function_as_a_parameter
         function replacer(match, p1, p2, p3, offset, string, groups) {
            // p1 is nondigits, p2 digits, and p3 non-alphanumerics
            return [match, p1, p2, p3, offset, string, groups].join(' - ')
         }
         const code = 'abc12345#$*%'
         const regex = /([^\d]*)(\d*)([^\w]*)/
         assert.strictEqual(
            code.replace(regex, replacer),
            new WizardString(code).replace(regex, replacer).toString(),
         )
      })
   })

   describe('replaceAll', () => {
      it('works with string replace', () => {
         assert.strictEqual(
            new WizardString('1212').replaceAll('2', '3').toString(),
            '1313',
         )
      })

      it('Should not treat string as regexp', () => {
         assert.strictEqual(
            new WizardString('1234').replaceAll('.', '*').toString(),
            '1234',
         )
      })

      it('Should use substitution directly', () => {
         assert.strictEqual(
            new WizardString('11').replaceAll('1', '$0$1').toString(),
            '$0$1$0$1',
         )
      })

      it('Should not search back', () => {
         assert.strictEqual(
            new WizardString('121212').replaceAll('12', '21').toString(),
            '212121',
         )
      })

      it('global regex result the same as .replace', () => {
         assert.strictEqual(
            new WizardString('1 2 3 4 a b c').replaceAll(/(\d)/g, 'xx$1$10').toString(),
            new WizardString('1 2 3 4 a b c').replace(/(\d)/g, 'xx$1$10').toString(),
         )

         assert.strictEqual(
            new WizardString('1 2 3 4 a b c').replaceAll(/(\d)/g, '$$').toString(),
            new WizardString('1 2 3 4 a b c').replace(/(\d)/g, '$$').toString(),
         )

         assert.strictEqual(
            new WizardString('hey this is magic').replaceAll(/(\w)(\w+)/g, (_, $1, $2) => `${$1.toUpperCase()}${$2}`).toString(),
            new WizardString('hey this is magic').replace(/(\w)(\w+)/g, (_, $1, $2) => `${$1.toUpperCase()}${$2}`).toString(),
         )
      })

      it('rejects with non-global regexp', () => {
         assert.throws(
            () => new WizardString('123').replaceAll(/./, ''),
            {
               name: 'TypeError',
               message: 'WizardString.prototype.replaceAll called with a non-global RegExp argument',
            },
         )
      })
   })
})
