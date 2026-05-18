const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const sourceExtensions = new Set(['.ts', '.tsx'])
const ignoredSegments = new Set(['node_modules', '.next'])

function runGit(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function isSourceFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  if (!sourceExtensions.has(path.extname(normalized))) return false
  return !normalized.split('/').some((segment) => ignoredSegments.has(segment))
}

function resolveExistingSource(filePath) {
  const absolute = path.resolve(root, filePath)
  if (!absolute.startsWith(root) || !fs.existsSync(absolute)) return null
  return isSourceFile(absolute) ? absolute : null
}

function changedSourceFiles() {
  const changed = runGit(['diff', '--name-only', '--diff-filter=ACMRTUXB', 'HEAD', '--', '*.ts', '*.tsx'])
  const includeUntracked = process.argv.includes('--include-untracked')
  const untracked = includeUntracked
    ? runGit(['ls-files', '--others', '--exclude-standard', '--', '*.ts', '*.tsx'])
    : []
  return [...changed, ...untracked]
}

function requestedSourceFiles() {
  return process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith('-'))
}

function unique(items) {
  return [...new Set(items)]
}

function loadCompilerOptions() {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json')
  if (!configPath) throw new Error('tsconfig.json not found')

  const config = ts.readConfigFile(configPath, ts.sys.readFile)
  if (config.error) {
    const message = ts.flattenDiagnosticMessageText(config.error.messageText, '\n')
    throw new Error(message)
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    root,
    { noEmit: true, incremental: false },
    configPath
  )

  return {
    options: {
      ...parsed.options,
      noEmit: true,
      incremental: false,
      tsBuildInfoFile: undefined,
    },
    ambientFiles: parsed.fileNames.filter((fileName) => fileName.endsWith('.d.ts')),
  }
}

function main() {
  const requested = requestedSourceFiles()
  const candidates = requested.length > 0 ? requested : changedSourceFiles()
  const files = unique(candidates.map(resolveExistingSource).filter(Boolean))

  if (files.length === 0) {
    console.log('No changed TypeScript files to check.')
    return
  }

  const { options, ambientFiles } = loadCompilerOptions()
  const program = ts.createProgram(unique([...files, ...ambientFiles]), options)
  const diagnostics = ts.getPreEmitDiagnostics(program)

  if (diagnostics.length > 0) {
    const host = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    }
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, host))
    process.exit(1)
  }

  const relativeFiles = files.map((file) => path.relative(root, file))
  console.log(`Targeted TypeScript check passed (${relativeFiles.length} file${relativeFiles.length === 1 ? '' : 's'}).`)
}

main()
