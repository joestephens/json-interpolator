const fs = require('fs')
const path = require('path')

const STATIC_DIR = './public'
const DATA_DIR = './data'
const DIST_DIR = './dist'

const promisify = (fn) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      })
    })
  }
}

// Node.js fs functions use callbacks. Promisify them so we can use await/async
const readdir = promisify(fs.readdir)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

// retrieve and loop over static directory filenames
readdir(STATIC_DIR).then(staticFiles => {
  staticFiles.forEach(async staticFile => {
    // get the static file's contents
    const fileContents = await readFile(path.join(STATIC_DIR, staticFile), 'utf8')

    // get the bit of the filename excluding the extension i.e. file.test.js becomes file.test
    const filenameParts = staticFile.split('.')
    const filename = filenameParts.slice(0, filenameParts.length - 1).join('.')

    // read contents of JSON file with matching filename
    const jsonData = JSON.parse(await readFile(path.join(DATA_DIR, `${filename}.json`)))

    // capture variables inside {{}}
    const handlebarRegex = /\{\{(.*?)\}\}/g

    let newFile = fileContents

    const matches = fileContents
      .match(handlebarRegex)
      .filter((match, index, matchArray) => matchArray.indexOf(match) === index)
      .forEach(match => {
        // Regex objects are unique so we redeclare here to ensure we always start searching from character 0
        const handlebarRegexClone = /\{\{(.*?)\}\}/g
        const variableName = handlebarRegexClone.exec(match)[1]
        if (variableName) {
          let value = resolve(jsonData, variableName)
          value = typeof value !== 'string' ? (JSON.stringify(value) || '') : value
          value = value.replace(new RegExp('"', 'g'), '\\"')
          newFile = newFile.replace(new RegExp(`${match}`, 'g'), value)
        }
      })

    console.log(newFile)
    await writeFile(path.join(DIST_DIR, staticFile), newFile, 'utf8')
  })
})

// take a string such as myObj.name and look for matching properties in an object { name: 'Hello' }
function resolve(object, string) {
  const parts = string.split('.')
  let val = object

  for (let i = 0; i < parts.length; i++) {
    val = val[parts[i]]
  }

  return val
}