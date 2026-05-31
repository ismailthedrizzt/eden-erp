# Two Environment Release Policy

## Purpose

This policy protects the accepted release surface while allowing fast development in a separate working copy and separate Supabase project.

## Decision

- Staging ortamı kullanılmayacak.
- Development ortamı gelistirme, demo, field test ve kullanici test alanidir.
- Release ortamı temiz canli/onaylanmis ortamdir.
- Mevcut `eden-erp` release kabul edilir.
- Yeni `eden-erp-development` aktif gelistirme calisma alanidir.
- Lokal DB kurulmayacak.
- Lokal FastAPI zorunlu degildir.
- Development ve Release ikisi de Vercel + Supabase uzerinde calisir.
- Development Supabase ayri project olmalidir.
- Ayni Supabase project icinde sadece ayri schema kullanimi onerilmez.
- Release Supabase korunan alan kabul edilir.
- Development Supabase serbest calisma/test alanidir.

## Visibility Rule

Develop ortaminda her sey denenebilir. Development Vercel genis test yuzeyini acabilir. Release ortaminda yalnizca onaylanmis, calisir ve kullaniciya anlatilabilir isler gorunur.

## P0/P1/P2 Priority

- P0: Release Supabase uzerinde izinsiz migration/seed/reset, release ortaminda login bypass, release route guard bypass.
- P1: Eksik route registry kaydi, development sayfasinin release navigation veya search sonucunda gorunmesi.
- P2: Dokuman eksikleri, advanced CI otomasyonu, ek deploy smoke senaryolari.

## Suggested Next Prompt

Development Supabase project bilgileri eklendikten sonra Development Vercel env dogrulama ve release smoke kontrolu yap.
