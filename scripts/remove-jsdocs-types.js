const fs = require('fs')
const path = require('path')

const srcPath = path.join(__dirname, '..', 'src')

function findFiles(dirPath) {
    const result = []
    const entries = fs.readdirSync(dirPath, {withFileTypes: true})

    entries.forEach((entry) => {
        const entryPath = path.join(dirPath, entry.name)
        if (entry.isFile() && entry.name.endsWith('.ts')) {
            result.push(entryPath)
        } else if (entry.isDirectory()) {
            result.push(...findFiles(entryPath))
        }
    })

    return result
}

findFiles(srcPath).forEach((file) => {
    let src = fs.readFileSync(file, 'utf-8')

    // Fix wrong use of @type instead of @return.
    src = src.replace(/(\n +\* \@param [^\n]*\n +\* )\@type /g, (match, p1) => p1 + '@return ')
    
    // Remove square brackets and default values from @param lines.
    src = src.replace(/(\n +\* @param +\{[^\n]+\} +)\[(\w+)[^\]\n]*\]/g, (match, p1, p2) => p1 + p2)

    // Remove types from @param and @return lines.
    src = src.replace(/(\n +\* \@(?:param|returns?) *)([a-zA-Z0-9_]+ *)?(\{[^\n]*)/g, (match, p1, p2, p3) => {
        p2 = p2 || ''
        let brackets = 1;
        let end = 0;
        for (let i = 1; brackets > 0 && i < p3.length; i++) {
            if (p3[i] == '{') {
                brackets++
            } else if (p3[i] == '}') {
                brackets--
                end = i + 1
            }
        }
        p1 = p1.trimEnd().replace('@returns', '@return')
        p2 = p2.trim()
        p3 = p3.slice(end).trim().replace(/^([a-zA-Z0-9_]+) +/, '$1 ')
        if (!p2 && !p3) return ''
        return p1 + ' ' + p2 + (p2 && p3 ? ' ' + p3 : p3)
    })

    // Remove @type lines.
    src = src.replace(/\n +\* \@type .*\n/g, '\n')

    // Remove consecutive empty doc lines.
    src = src.replace(/\n *\* *(\n *\*\/? *\n)/g, (match, p1) => p1)

    // Remove empty docs.
    src = src.replace(/\n *\/\*\*[ \n\*]+\*\/ *\n/g, '\n')

    // Fix indentation.
    src = src.replace(/(\n +\* +(?:@param \w+|@return) )([^\n]*)((?:\n +\* +[^@\n][^\n]+)+)/g, (match, p1, p2, p3) => {
        const indent = p1.length
        p3 = p3.replace(/(\n +\*)( +)([^\n]+)/g, (match, p1, p2, p3) => {
            p2 = new Array(Math.max(0, indent - p1.length + 1)).join(' ')
            return p1 + p2 + p3
        })
        return p1 + p2 + p3
    })

    fs.writeFileSync(file, src)
})
