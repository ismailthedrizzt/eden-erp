# Person Model

`persons` is the master table for real people.

## Unique Identity

A person is uniquely identified by either:

- `nationality + national_id`
- `nationality + passport_no`

Rules:

- at least one of `national_id` or `passport_no` is required
- Turkish citizens should prefer `national_id`
- foreign persons can use `passport_no`

## Prefill Fields

When found, person data can prefill:

- first name
- last name
- full name
- nationality
- national id
- passport no
- birth date
- birth place
- gender
- phone
- email
- address

Fields coming from master data are marked as `Master kayittan geldi`.
