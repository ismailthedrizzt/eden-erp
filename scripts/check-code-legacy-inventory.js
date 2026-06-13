const { analyze } = require('./generate-code-legacy-inventory')

function main() {
  const result = analyze()

  console.log('Code legacy inventory guard')
  console.log(`- legacy routes: ${result.routeInventory.length}`)
  console.log(`- legacy services: ${result.serviceInventory.length}`)
  console.log(`- BFF/API routes: ${result.bffInventory.length}`)
  console.log(`- Supabase/Vercel residue hits: ${result.residueInventory.length}`)
  console.log(`- generated/blocked page debt: ${result.generatedContractInventory.length}`)
  console.log(`- P0 findings: ${result.p0Findings.length}`)

  if (result.p0Findings.length > 0) {
    console.error('\nP0 legacy findings must be fixed before this guard can pass:')
    for (const finding of result.p0Findings) {
      console.error(`- [${finding.classification || finding.severity}] ${finding.title}`)
      console.error(`  file: ${finding.file}`)
      console.error(`  evidence: ${finding.evidence}`)
      console.error(`  decision: ${finding.decision}`)
    }
    process.exit(1)
  }

  console.log('Code legacy inventory guard passed.')
}

if (require.main === module) {
  main()
}
