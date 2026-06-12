const fs = require('fs')
const path = require('path')

const root = process.cwd()
const errors = []
const warnings = []

const lifecycleFiles = walk(path.join(root, 'contracts', 'lifecycle')).filter(file => file.endsWith('.contract.ts'))
const backendFiles = walk(path.join(root, 'backend', 'app')).filter(file => file.endsWith('.py'))
const backendSourceByFile = new Map(backendFiles.map(file => [file, fs.readFileSync(file, 'utf8')]))
const tableMap = parseLifecycleTableMap(readOptional('contracts/lifecycle/lifecycle-table-map.contract.ts'))

for (const file of lifecycleFiles) {
  if (file.endsWith('lifecycle-table-map.contract.ts')) continue
  const source = fs.readFileSync(file, 'utf8')
  const contract = parseLifecycleContract(source, relative(file))
  validateLifecycleContract(contract)
}

validateDirectLifecycleMutation()

console.log('Lifecycle operation guard')
console.log(`- lifecycle contract files: ${lifecycleFiles.length}`)
console.log(`- backend files scanned: ${backendFiles.length}`)
console.log(`- warnings: ${warnings.length}`)
console.log(`- errors: ${errors.length}`)

for (const warning of warnings.slice(0, 60)) console.warn(`WARNING ${warning}`)
if (warnings.length > 60) console.warn(`WARNING ... ${warnings.length - 60} additional warnings omitted`)
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`)
  process.exit(1)
}

function validateLifecycleContract(contract) {
  if (!contract.entityName) errors.push(`${contract.file}: missing entityName`)
  if (!contract.transactionTable) errors.push(`${contract.file}: missing transactionTable`)
  const insertTargets = findInsertTargets(contract.transactionTable)
  const mappedTable = tableMap.get(contract.transactionTable)
  if (!insertTargets.length && mappedTable) insertTargets.push(...findInsertTargets(mappedTable.physicalTable))
  if (!insertTargets.length && contract.operationRecordRequired) {
    errors.push(`${contract.file}: operationRecordRequired lifecycle has no backend insert into transactionTable ${contract.transactionTable}`)
  }
  if (mappedTable && isExpired(mappedTable.expiresAt)) {
    errors.push(`${contract.file}: lifecycle table mapping expired for ${contract.transactionTable}`)
  }
  if (contract.operationRecordRequired) {
    for (const target of insertTargets) {
      if (/operation_id\s*,\s*process_instance_id[\s\S]{0,400}null\s*,\s*null/i.test(target.sql)) {
        errors.push(`${contract.file}: backend inserts ${target.table} with operation_id/process_instance_id both null (${relative(target.file)})`)
      }
      if (!/operation_id|process_instance_id/i.test(target.sql)) {
        errors.push(`${contract.file}: backend transaction insert lacks operation_id/process_instance_id linkage (${relative(target.file)})`)
      }
    }
  }
}

function validateDirectLifecycleMutation() {
  const statusFields = ['record_status', 'employment_status', 'lifecycle_status', 'workflow_status', 'authority_record_status', 'ownership_status', 'company_status']
  for (const [file, source] of backendSourceByFile) {
    const mutatesStatus = statusFields.some(field => new RegExp(`update[\\s\\S]{0,200}\\b${field}\\b\\s*=`, 'i').test(source))
    if (!mutatesStatus) continue
    const hasTransactionInsert = /insert\s+into[\s\S]{0,300}(operation_requests|transactions|events|history)/i.test(source)
    if (!hasTransactionInsert) {
      errors.push(`${relative(file)}: direct lifecycle/status mutation without visible transaction/event insert`)
    }
  }
}

function findInsertTargets(tableName) {
  const results = []
  for (const [file, source] of backendSourceByFile) {
    const regex = new RegExp(`insert\\s+into\\s+(?:public\\.)?${escapeRegExp(tableName)}[\\s\\S]*?(?:returning|;|"""|'''|\\))`, 'ig')
    let match
    while ((match = regex.exec(source))) {
      results.push({ file, table: tableName, sql: match[0] })
    }
  }
  return results
}

function parseLifecycleContract(source, file) {
  return {
    file,
    entityName: field(source, 'entityName'),
    transactionTable: field(source, 'transactionTable'),
    operationRecordRequired: /operationRecordRequired:\s*true/.test(source),
  }
}

function parseLifecycleTableMap(source) {
  const mappings = new Map()
  const blocks = source.match(/\{[\s\S]*?\}/g) || []
  for (const block of blocks) {
    const contractTable = field(block, 'contractTransactionTable') || field(block, 'contractTable')
    const physicalTable = field(block, 'physicalTable')
    if (contractTable && physicalTable) {
      mappings.set(contractTable, {
        physicalTable,
        owner: field(block, 'owner'),
        expiresAt: field(block, 'expiresAt'),
        reason: field(block, 'reason'),
      })
    }
  }
  return mappings
}

function field(source, name) {
  const match = source.match(new RegExp(`${name}:\\s*['"]([^'"]*)['"]`))
  return match ? match[1] : undefined
}

function isExpired(value) {
  return value && new Date(value) < new Date()
}

function readOptional(relativePath) {
  const fullPath = path.join(root, relativePath)
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : ''
}

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return [fullPath]
  })
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/')
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
