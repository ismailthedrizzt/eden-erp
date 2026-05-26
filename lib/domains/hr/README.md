# HR Domain

HR Domain owns employees, employment lifecycle and employee assignments.

It does not own representative authority or partner ownership. A person can be an employee, partner and representative, but those are separate domain relationships.

## Owns

- Employees
- Employment lifecycle events
- Employee assignments

## Does Not Own

- Representative authority
- Partner ownership
- Branch official lifecycle

## Service Functions

- Placeholder only in this phase.
- Future: `createEmployee`, `startEmployment`, `endEmployment`, `assignEmployee`.

## Cross-Domain Rules

- HR can consume organization/facility closure impacts.
- HR must not grant representative authority.

## Events

- `hr.employee_created`
- `hr.employment_started`
- `hr.employment_ended`

## Business Rules

- The same person can have HR, ownership and representative relationships, but each relationship belongs to its own domain.
