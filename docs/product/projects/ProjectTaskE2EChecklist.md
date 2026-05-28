# Project / Task E2E Checklist

## E2E Basliklari

- project create
- project list/detail
- task create
- assign task
- transition task
- kanban view
- comment task
- attach file
- my tasks action center
- related branch task appears in branch detail
- permission denied for unauthorized user

## Seed Data

- active company
- user/employee assignee
- active project
- task todo
- task in_progress
- task blocked
- task done
- related branch

## Manual Kontrol

1. Proje/Gorev menusu gorunur.
2. Projeler sayfasi acilir.
3. Proje olusturulur.
4. Gorevler sayfasi acilir.
5. Gorev olusturulur.
6. Atama yapilir.
7. Status transition calisir.
8. Kanban gorunur.
9. Yorum eklenir.
10. Dosya referansi eklenir.
11. Action Center'da gorev `Proje Gorevi` olarak gorunur.
12. Ilgili kayit detayinda gorev gorunur.
13. Yetkisiz kullanici erisemez.
14. Teknik hata kullaniciya gosterilmez.

## Playwright Aday Dosya

`tests/e2e/projects-tasks.spec.ts`
