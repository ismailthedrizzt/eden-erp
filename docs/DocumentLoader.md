# Document Loader

`components/ui/DocumentSlotUploader.tsx` is the shared document loader. It keeps the existing slot-based upload behavior and adds central registry selection.

## Modes

The loader supports two modes:

- `Yeni Belge Yükle`: upload a new file and create a new registry document.
- `Mevcut Belgeden Seç`: search existing registry documents and link one to the active module record.

When selecting an existing document, the loader filters by:

- `company_id`
- `document_type`
- `linked_module`
- `linked_record_id`
- `link_type`
- search text

The list shows:

- document title
- document type
- issue date
- expiry date
- status

## Linking Contract

The component accepts a `registry` prop. Modules should pass:

```tsx
registry={{
  enabled: true,
  companyId,
  documentType: 'İmza Sirküleri',
  linkedModule: 'representatives',
  linkedRecordId: representativeId,
  linkType: 'authority_basis',
}}
```

After an existing document is selected, the component calls `/api/document-links` and stores a `document_links` row. No new file is uploaded.

## Module Integration

All modules with documents should use this shared loader:

- Companies
- Employees
- Partners
- Representatives
- Stakeholders
- Vehicles
- Ownership Transactions
- Huzur Hakkı Tahakkukları
- Accounting

Module-specific forms can keep local slot definitions, but document persistence should flow through the central registry.
