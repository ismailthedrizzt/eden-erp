const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const root = path.resolve(__dirname, '..')
const envPath = path.join(root, '.env.local')

function readEnv(filePath) {
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

async function main() {
  const env = readEnv(envPath)
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is missing in .env.local')

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(`
      create extension if not exists "pgcrypto";

      alter table if exists employees add column if not exists person_id uuid references persons(id);
      alter table if exists sirketler add column if not exists organization_id uuid references organizations(id);
      alter table if exists stakeholders add column if not exists person_id uuid references persons(id);
      alter table if exists stakeholders add column if not exists organization_id uuid references organizations(id);
      alter table if exists sirket_ortaklar add column if not exists person_id uuid references persons(id);
      alter table if exists sirket_ortaklar add column if not exists organization_id uuid references organizations(id);

      with employee_source as (
        select
          e.*,
          case
            when e.uyruk is null or btrim(e.uyruk) = '' then 'TR'
            when lower(e.uyruk) in ('tr', 'tc', 't.c.', 'türkiye', 'turkiye', 'türk', 'turk') then 'TR'
            else e.uyruk
          end as normalized_nationality,
          nullif(regexp_replace(coalesce(e.tc_kimlik, ''), '\\D', '', 'g'), '') as normalized_national_id,
          nullif(btrim(coalesce(e.pasaport_no, '')), '') as normalized_passport_no,
          btrim(concat_ws(' ', e.ad, e.soyad)) as normalized_full_name
        from employees e
        where e.person_id is null
      ),
      inserted_persons as (
        insert into persons (
          first_name,
          last_name,
          full_name,
          nationality,
          national_id,
          passport_no,
          birth_date,
          birth_place,
          gender,
          phone,
          email,
          address,
          metadata_json
        )
        select
          nullif(e.ad, ''),
          nullif(e.soyad, ''),
          e.normalized_full_name,
          e.normalized_nationality,
          e.normalized_national_id,
          e.normalized_passport_no,
          e.dogum_tarihi,
          nullif(e.dogum_yeri, ''),
          nullif(e.cinsiyet, ''),
          coalesce(nullif(e.cep_telefonu, ''), nullif(e.is_telefonu, '')),
          nullif(e.email, ''),
          nullif(e.adres, ''),
          jsonb_build_object('source_table', 'employees', 'source_id', e.id, 'source', 'sync_master_identities')
        from employee_source e
        where e.normalized_full_name <> ''
          and not exists (
            select 1
            from persons p
            where coalesce(p.is_deleted, false) = false
              and (
                (e.normalized_national_id is not null and p.national_id = e.normalized_national_id)
                or (e.normalized_passport_no is not null and lower(p.nationality) = lower(e.normalized_nationality) and p.passport_no = e.normalized_passport_no)
              )
          )
        on conflict do nothing
        returning id
      ),
      updated_employees as (
        update employees e
        set person_id = p.id
        from persons p
        where e.person_id is null
          and coalesce(p.is_deleted, false) = false
          and (
            (nullif(regexp_replace(coalesce(e.tc_kimlik, ''), '\\D', '', 'g'), '') is not null and p.national_id = nullif(regexp_replace(coalesce(e.tc_kimlik, ''), '\\D', '', 'g'), ''))
            or (nullif(btrim(coalesce(e.pasaport_no, '')), '') is not null and p.passport_no = nullif(btrim(coalesce(e.pasaport_no, '')), ''))
            or (lower(p.full_name) = lower(btrim(concat_ws(' ', e.ad, e.soyad))) and p.birth_date = e.dogum_tarihi)
          )
        returning e.id
      ),
      company_source as (
        select
          s.*,
          case
            when s.ulke is null or btrim(s.ulke) = '' then 'TR'
            when lower(s.ulke) in ('tr', 'tc', 't.c.', 'türkiye', 'turkiye') then 'TR'
            else s.ulke
          end as normalized_country,
          nullif(regexp_replace(coalesce(s.vkn_tckn, ''), '\\D', '', 'g'), '') as normalized_tax_number
        from sirketler s
        where s.organization_id is null
      ),
      inserted_organizations as (
        insert into organizations (
          legal_name,
          short_name,
          country,
          tax_number,
          registration_number,
          tax_office,
          organization_type,
          phone,
          email,
          address,
          city,
          district,
          metadata_json
        )
        select
          s.ticari_unvan,
          s.kisa_unvan,
          s.normalized_country,
          s.normalized_tax_number,
          nullif(coalesce(s.ticaret_sicil_no, s.mersis_no), ''),
          nullif(s.vergi_dairesi, ''),
          nullif(s.sirket_turu, ''),
          nullif(s.telefon, ''),
          nullif(s.email, ''),
          nullif(s.adres, ''),
          nullif(s.il, ''),
          nullif(s.ilce, ''),
          jsonb_build_object('source_table', 'sirketler', 'source_id', s.id, 'source', 'sync_master_identities')
        from company_source s
        where nullif(s.ticari_unvan, '') is not null
          and not exists (
            select 1
            from organizations o
            where coalesce(o.is_deleted, false) = false
              and (
                (s.normalized_tax_number is not null and o.tax_number = s.normalized_tax_number)
                or (lower(o.legal_name) = lower(s.ticari_unvan) and lower(o.country) = lower(s.normalized_country))
              )
          )
        on conflict do nothing
        returning id
      ),
      updated_companies as (
        update sirketler s
        set organization_id = o.id
        from organizations o
        where s.organization_id is null
          and coalesce(o.is_deleted, false) = false
          and (
            (nullif(regexp_replace(coalesce(s.vkn_tckn, ''), '\\D', '', 'g'), '') is not null and o.tax_number = nullif(regexp_replace(coalesce(s.vkn_tckn, ''), '\\D', '', 'g'), ''))
            or (lower(o.legal_name) = lower(s.ticari_unvan))
          )
        returning s.id
      ),
      stakeholder_person_source as (
        select
          st.*,
          case
            when st.country is null or btrim(st.country) = '' then 'TR'
            when lower(st.country) in ('tr', 'tc', 't.c.', 'türkiye', 'turkiye', 'türk', 'turk') then 'TR'
            else st.country
          end as normalized_country,
          nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), '') as normalized_identity
        from stakeholders st
        where st.person_id is null
          and coalesce(st.stakeholder_type, 'gercek_kisi') <> 'tuzel_kisi'
      ),
      inserted_stakeholder_persons as (
        insert into persons (full_name, nationality, national_id, passport_no, phone, email, metadata_json)
        select
          st.display_name,
          st.normalized_country,
          case when length(st.normalized_identity) = 11 then st.normalized_identity else null end,
          case when length(coalesce(st.normalized_identity, '')) <> 11 then nullif(st.tax_id, '') else null end,
          nullif(st.phone, ''),
          nullif(st.email, ''),
          jsonb_build_object('source_table', 'stakeholders', 'source_id', st.id, 'source', 'sync_master_identities')
        from stakeholder_person_source st
        where nullif(st.display_name, '') is not null
          and not exists (
            select 1
            from persons p
            where coalesce(p.is_deleted, false) = false
              and (
                (length(coalesce(st.normalized_identity, '')) = 11 and p.national_id = st.normalized_identity)
                or (lower(p.full_name) = lower(st.display_name) and lower(p.nationality) = lower(st.normalized_country))
              )
          )
        on conflict do nothing
        returning id
      ),
      updated_stakeholder_persons as (
        update stakeholders st
        set person_id = p.id,
            stakeholder_kind = 'person'
        from persons p
        where st.person_id is null
          and coalesce(st.stakeholder_type, 'gercek_kisi') <> 'tuzel_kisi'
          and coalesce(p.is_deleted, false) = false
          and (
            (nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), '') is not null and p.national_id = nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), ''))
            or (lower(p.full_name) = lower(st.display_name))
          )
        returning st.id
      ),
      stakeholder_org_source as (
        select
          st.*,
          case
            when st.country is null or btrim(st.country) = '' then 'TR'
            when lower(st.country) in ('tr', 'tc', 't.c.', 'türkiye', 'turkiye') then 'TR'
            else st.country
          end as normalized_country,
          nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), '') as normalized_tax_number
        from stakeholders st
        where st.organization_id is null
          and st.stakeholder_type = 'tuzel_kisi'
      ),
      inserted_stakeholder_orgs as (
        insert into organizations (legal_name, country, tax_number, phone, email, city, metadata_json)
        select
          st.display_name,
          st.normalized_country,
          st.normalized_tax_number,
          nullif(st.phone, ''),
          nullif(st.email, ''),
          nullif(st.city, ''),
          jsonb_build_object('source_table', 'stakeholders', 'source_id', st.id, 'source', 'sync_master_identities')
        from stakeholder_org_source st
        where nullif(st.display_name, '') is not null
          and not exists (
            select 1
            from organizations o
            where coalesce(o.is_deleted, false) = false
              and (
                (st.normalized_tax_number is not null and o.tax_number = st.normalized_tax_number)
                or (lower(o.legal_name) = lower(st.display_name) and lower(o.country) = lower(st.normalized_country))
              )
          )
        on conflict do nothing
        returning id
      ),
      updated_stakeholder_orgs as (
        update stakeholders st
        set organization_id = o.id,
            stakeholder_kind = 'organization'
        from organizations o
        where st.organization_id is null
          and st.stakeholder_type = 'tuzel_kisi'
          and coalesce(o.is_deleted, false) = false
          and (
            (nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), '') is not null and o.tax_number = nullif(regexp_replace(coalesce(st.tax_id, ''), '\\D', '', 'g'), ''))
            or (lower(o.legal_name) = lower(st.display_name))
          )
        returning st.id
      )
      select
        (select count(*) from inserted_persons) as inserted_persons,
        (select count(*) from updated_employees) as linked_employees,
        (select count(*) from inserted_organizations) as inserted_organizations,
        (select count(*) from updated_companies) as linked_companies,
        (select count(*) from inserted_stakeholder_persons) as inserted_stakeholder_persons,
        (select count(*) from updated_stakeholder_persons) as linked_stakeholder_persons,
        (select count(*) from inserted_stakeholder_orgs) as inserted_stakeholder_organizations,
        (select count(*) from updated_stakeholder_orgs) as linked_stakeholder_organizations;
    `)

    await client.query('COMMIT')

    const rows = Array.isArray(result)
      ? [...result].reverse().find((item) => Array.isArray(item.rows) && item.rows.length > 0)?.rows
      : result.rows

    console.table(rows || [])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
