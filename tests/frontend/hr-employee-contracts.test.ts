import { readFileSync } from 'node:fs'
import { employeeApiServiceFunctions } from '../../contracts/api/hr/employee.api.contract'
import { employeeModalContracts } from '../../contracts/forms/hr/employee.form.contract'
import { employeeListContract } from '../../contracts/lists/hr/employee.list.contract'
import { employeePageContract } from '../../contracts/pages/hr/employee.page.contract'
import { assignmentChangeWizardContract } from '../../contracts/wizards/hr/assignment-change.wizard.contract'
import { employmentStartWizardContract } from '../../contracts/wizards/hr/employment-start.wizard.contract'
import { employmentTerminationWizardContract } from '../../contracts/wizards/hr/employment-termination.wizard.contract'
import { sgkEntryWizardContract } from '../../contracts/wizards/hr/sgk-entry.wizard.contract'
import { sgkExitWizardContract } from '../../contracts/wizards/hr/sgk-exit.wizard.contract'

const employeePageSource = readFileSync('app/app/ik/calisanlar/page.tsx', 'utf8')

export function testEmployeePageImportsContracts() {
  for (const importPath of [
    '@/contracts/pages/hr/employee.page.contract',
    '@/contracts/lists/hr/employee.list.contract',
    '@/contracts/forms/hr/employee.form.contract',
    '@/contracts/wizards/hr/employment-start.wizard.contract',
    '@/contracts/wizards/hr/employment-termination.wizard.contract',
    '@/contracts/wizards/hr/assignment-change.wizard.contract',
    '@/contracts/wizards/hr/sgk-entry.wizard.contract',
    '@/contracts/wizards/hr/sgk-exit.wizard.contract',
    '@/contracts/lifecycle/hr/employee.lifecycle.contract',
    '@/contracts/api/hr/employee.api.contract',
  ]) {
    if (!employeePageSource.includes(importPath)) throw new Error(`Missing employee contract import: ${importPath}`)
  }
  return employeePageContract.route
}

export function testEmployeeListColumnsMatchContract() {
  if (/const\s+columns\s*[:=]\s*\[/.test(employeePageSource)) throw new Error('Employee page must not define local columns array.')
  return employeeListContract.columns.map(column => column.key)
}

export function testEmployeeWizardActionsAreContractCovered() {
  return [
    employmentStartWizardContract,
    employmentTerminationWizardContract,
    assignmentChangeWizardContract,
    sgkEntryWizardContract,
    sgkExitWizardContract,
  ].map(contract => contract.submitOperation)
}

export function testEmployeeModalActionsAreContractCovered() {
  return [employeeModalContracts.create.apiServiceCommand, employeeModalContracts.document.apiServiceCommand]
}

export function testEmployeeApiServiceCallsAreContractCovered() {
  const serviceCalls = Array.from(employeePageSource.matchAll(/\b(employeesService|employmentService)\.([A-Za-z0-9_]+)/g))
    .map(match => `${match[1]}.${match[2]}`)
    .filter((value, index, items) => items.indexOf(value) === index)
  for (const serviceCall of serviceCalls) {
    if (!employeeApiServiceFunctions.includes(serviceCall)) {
      throw new Error(`Employee API service call missing from contract: ${serviceCall}`)
    }
  }
  return serviceCalls
}
