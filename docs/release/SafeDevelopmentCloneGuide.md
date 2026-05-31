# Safe Development Clone Guide

## Purpose

Release klasorunu bozmadan Codex ve aktif gelistirme icin ayri bir working copy kullanilir.

## Setup

```bash
cd <workspace-parent>
git clone <eden-erp-repo-url> eden-erp-development
cd eden-erp-development
git checkout -b develop
```

Bu calismada hedef klasor:

```text
C:\Users\ismai\Desktop\eden-erp-development
```

## Folder Roles

```text
eden-erp
  -> release calisma alani
  -> mevcut GitHub/Vercel/Supabase release yapisi
  -> dogrudan gelistirme yapilmaz

eden-erp-development
  -> aktif gelistirme alani
  -> Codex burada calisir
  -> Development Vercel ve Development Supabase kullanir
```

## Workflow

```text
eden-erp-development
-> Codex gelistirme yapar
-> Development Vercel deploy eder
-> Development Supabase kullanilir
-> demo/field test yapilir
-> insan onayi verilir
-> degisiklik release branch/main'e aktarilir
-> eden-erp release ortami guncellenir
```

## P0/P1/P2 Priority

- P0: Codex'in `eden-erp` release klasorunde aktif gelistirme yapmasi.
- P1: Development clone env dosyalarinin release Supabase'e bakmasi.
- P2: Branch isimlerinin standardize edilmemesi.

## Suggested Next Prompt

`eden-erp-development` Vercel project linking ve Development Supabase env degerlerini dogrula.
