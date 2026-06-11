const { spawnSync } = require('child_process')

const quick = process.argv.includes('--quick') || process.env.EDEN_QUALITY_GATE_PROFILE === 'quick'
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const quickChecks = [
  ['page flow contracts', ['run', 'page-flow:contract:check']],
  ['typecheck', ['run', 'typecheck:local']],
  ['release registry', ['run', 'release:check']],
  ['environment safety', ['run', 'env:safety']],
  ['database target safety', ['run', 'db:target:check']],
  ['import boundaries', ['run', 'boundaries:check']],
  ['OpenAPI drift', ['run', 'openapi:drift']],
]

const releaseOnlyChecks = [
  ['security guard', ['run', 'security:guard']],
  ['performance guard', ['run', 'perf:guard']],
  ['backend lint', ['run', 'backend:lint']],
  ['backend typecheck', ['run', 'backend:typecheck']],
  ['backend tests', ['run', 'backend:test']],
  ['frontend build', ['run', 'build']],
  ['smoke test dry run', ['run', 'smoke:test:dry']],
  ['theme validation', ['run', 'theme:hikmet:validate']],
]

function runCheck(name, args) {
  console.log('\n==> ' + name)
  const result = spawnSync(npmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error('\nQuality gate failed at: ' + name)
    process.exit(result.status || 1)
  }
}

const checks = quick ? quickChecks : [...quickChecks, ...releaseOnlyChecks]
for (const [name, args] of checks) runCheck(name, args)

console.log('\n' + (quick ? 'Quick' : 'Release-grade') + ' quality gate passed.')
