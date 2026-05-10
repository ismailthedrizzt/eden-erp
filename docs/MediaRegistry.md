# Media Registry

Eden ERP stores photos and logos in `media_assets` so people, organizations, companies, vehicles, and module records can reuse the same media without re-uploading it.

## Table

`media_assets` fields:

- `entity_kind`: `person`, `organization`, `company`, or `vehicle`
- `person_id`
- `organization_id`
- `company_id`
- `linked_module`
- `linked_record_id`
- `media_type`: `profile_photo`, `logo`, `vehicle_photo`, or `gallery`
- `storage_path`
- `file_name`
- `mime_type`
- `is_primary`
- audit fields, soft delete flag, and `version`

## Reuse Rule

A person's photo should be uploaded once to the master person record. Employees, partners, representatives, and stakeholders display or link that same `media_assets` row.

For organizations, the same rule applies to logos. Vehicles can reuse central vehicle photos or gallery entries.

## UI Behavior

Photo cards support:

- Upload New Photo
- Select Existing Photo
- Set as Primary
- Replace
- View History

When the current record is linked to a master `person_id`, `organization_id`, `company_id`, or vehicle record, the UI should show existing media assets from that master record first.
