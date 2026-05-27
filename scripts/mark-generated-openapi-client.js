const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'lib/generated/backend-client/types.ts')
const marker = '// GENERATED_DO_NOT_EDIT\n// Source: FastAPI OpenAPI contract\n\n'
const current = fs.readFileSync(target, 'utf8')

if (!current.startsWith('// GENERATED_DO_NOT_EDIT')) {
  fs.writeFileSync(target, `${marker}${current}`, 'utf8')
}
