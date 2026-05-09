# Organization Model

`organizations` is the master table for legal entities.

## Unique Identity

An organization is uniquely identified by:

- `country + tax_number`

Fallback:

- `country + registration_number`

The fallback path should be treated as a duplicate-risk warning, not blind creation.

## Prefill Fields

When found, organization data can prefill:

- legal name
- short name
- country
- tax number
- registration number
- tax office
- organization type
- phone
- email
- address
- city
- district
