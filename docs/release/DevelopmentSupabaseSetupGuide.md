# Development Supabase Setup Guide

## Purpose

Development verisi, auth kullanicilari, storage bucketlari, RLS policy denemeleri ve migration testleri Release Supabase project'inden ayrilir.

## Recommended Structure

Release Supabase Project:

- Mevcut canli/release veri alanidir.
- Codex migration denemesi yapmaz.
- Demo seed/reset calismaz.
- Sadece onayli release migration ile degisir.

Development Supabase Project:

- Ayri Supabase project olarak acilir.
- Development schema/migration/seed burada uygulanir.
- Demo kullanicilar burada acilir.
- Test/demo verileri burada tutulur.
- Gerekirse resetlenebilir.

## Why Separate Project

- Auth kullanicilari karismaz.
- Storage bucketlari karismaz.
- RLS policy denemeleri release'i etkilemez.
- Migration hedefi yanlislikla release verisine dokunmaz.
- Codex guvenli sekilde gelistirme yapar.
- Demo/field test verileri release'i kirletmez.

## Same Project Separate Schema

Ayni Supabase project icinde ayri schema kullanimi mumkundur ama onerilmez:

- Supabase client varsayilan olarak `public` schema ile calisir.
- Auth/storage ayrimi schema ile cozulemez.
- RLS/policy karmasasi artar.
- Migration hedefi karisma riski devam eder.
- Canli veriye yanlislikla dokunma riski yuksektir.

## Guard Commands

```bash
npm run env:safety
npm run supabase:target:check
```

Release migration icin explicit onay gerekir:

```bash
ALLOW_RELEASE_DB_MIGRATION=true
RELEASE_MIGRATION_APPROVED_BY=<name>
```

## P0/P1/P2 Priority

- P0: Development env'in Release Supabase URL/ref kullanmasi.
- P1: Demo seed/reset scriptlerinin release hedefinde calisabilmesi.
- P2: Supabase project ref naming standardinin eksik olmasi.

## Suggested Next Prompt

Development Supabase project ref ve Vercel env degerlerini repo guard scriptleriyle dogrula.
