# Document Storage Security

## Ilke

Belge dosyasi kullaniciya raw storage path veya kalici public URL olarak verilmez. Uygulama belge metadata'sini merkezi `documents` tablosunda tutar; storage erisimi backend izin ve scope kontrolu sonrasi kisa omurlu signed URL ile yapilir.

## Storage Path

Standart path:

```text
tenant/{tenant_id}/company/{company_id}/entity/{entity_type}/{entity_id}/{document_id}/{filename}
```

Kurallar:

- `..`, absolute path ve `http(s)://` path degerleri reddedilir.
- Path tenant segmenti icermelidir.
- Dosya adi sanitize edilir.
- Raw path UI cevabindan cikarilir, masked path donulur.

## Dosya Validasyonu

Desteklenen tipler:

- PDF
- JPG/JPEG
- PNG
- WEBP
- DOC/DOCX
- XLS/XLSX
- CSV
- TXT

Engellenen uzantilar:

- `.exe`
- `.bat`
- `.cmd`
- `.js`
- `.vbs`
- `.sh`
- `.ps1`
- `.jar`

Varsayilan maksimum boyut: 20 MB.

## Signed URL Flow

1. Kullanici `/documents/{id}/download-url` veya `/preview-url` ister.
2. Backend auth ve tenant kontrolu yapar.
3. Permission kontrolu yapar.
4. Belge metadata yuklenir.
5. Company scope kontrolu yapilir.
6. Storage provider signed URL uretir.
7. `document_access_logs` kaydi yazilir.
8. Audit kaydinda signed URL maskelenir.

## Audit

Audit payload'inda bulunabilir:

- `document_id`
- `owner_entity_type`
- `owner_entity_id`
- `document_type`
- `file_name`
- `file_size`
- `status`

Audit payload'inda bulunamaz:

- signed URL
- service role key
- raw signed storage URL

Storage path yalniz masked veya admin-only teknik metadata olarak gorunmelidir.
