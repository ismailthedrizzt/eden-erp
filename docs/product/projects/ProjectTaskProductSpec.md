# Project / Task Management Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Proje ve Gorevler modulu, Eden ERP icinde ekiplerin proje, issue, atama, oncelik, yorum, ek ve Kanban takiplerini sirket/ERP kayitlariyla baglantili yonetmesini saglar. Tam Jira klonu degildir; ilk urun hedefi proje karti, proje gorevi, temel status workflow, yorum, ek, related record ve Action Center gorunurlugudur.

## Domain Siniri

Project/Task domain sahip oldugu kavramlar:

- proje
- gorev / issue
- gorev turu, durumu ve onceligi
- assignee, reporter, son tarih
- yorum, ek, etiket
- Kanban kolonlari
- related ERP kaydi
- gorev gecmisi

Project/Task domain sahip olmadigi kavramlar:

- process engine internal task ownership
- resmi company operation
- HR istihdam lifecycle
- accounting transaction
- branch lifecycle
- representative authority
- ownership transaction

“Process task sistem işleminin parçasıdır. Project task ise ekip iş takibidir. Action Center ikisini kullanıcıya tek iş listesi olarak gösterebilir ama veri modeli ve lifecycle ayrıdır.”

## Proje Modeli

Proje bir `company_id` altinda acilir. `branch_id`, `organization_unit_id` ve `facility_id` opsiyonel scope alanlaridir. `project_key` tenant/company icinde benzersizdir. Durumlar: `draft`, `active`, `on_hold`, `completed`, `cancelled`.

Completed/cancelled projede yeni gorev acma policy tarafindan engellenir.

## Gorev / Issue Modeli

Gorev proje icinde veya bagimsiz olabilir; yine de `company_id` zorunludur. Durumlar:

- `backlog`
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`
- `cancelled`

Oncelikler: `lowest`, `low`, `medium`, `high`, `highest`, `urgent`.

## Status Workflow

MVP gecisleri:

- `todo` -> `in_progress`
- `in_progress` -> `review`
- `review` -> `done`
- herhangi acik durum -> `blocked`
- `blocked` -> `in_progress` veya `todo`
- acik durumlar -> `cancelled`

`blocked` gecisinde neden istenir. `done` ve `cancelled` final durumdur; normal edit sinirlidir.

## Kanban MVP

Kanban kolonlari Backlog, Yapilacak, Devam Ediyor, Bloke, Incelemede, Tamamlandi ve Iptal olarak gosterilir. Drag/drop sonraki faza birakilmistir; MVP button-based transition kullanir.

## Comments / Attachments

Yorumlar task detail altinda thread olarak tutulur. Ekler `file_ref`, `file_name` ve `file_type` ile kaydedilir. Signed URL audit/log icine yazilmaz.

## Related Entity

Gorevler `company`, `branch`, `partner`, `representative`, `employee`, `facility`, `organization_unit`, `accounting_transaction`, `process_instance` gibi ERP kayitlarina baglanabilir. Ilgili kayit secilirse gorev o kaydin pending/action baglaminda gorunebilir.

## Action Center

Project task Action Center'a `source_type=project_task` olarak girer. Process Engine gorevleri `source_type=process_task` olarak kalir. UI etiketleri:

- Surec Gorevi
- Proje Gorevi

## Permissions

- `projects.view`
- `projects.edit`
- `projects.create`
- `projects.delete`
- `tasks.view`
- `tasks.create`
- `tasks.edit`
- `tasks.assign`
- `tasks.transition`
- `tasks.comment`
- `tasks.attachmentsManage`
- `tasks.delete`
- `projects.admin`

## Module Readiness

Required:

- `project_projects`
- `project_tasks`

Optional:

- `project_task_comments`
- `project_task_attachments`
- `project_task_history`
- `hr_employees`
- `organization_units`

Dependencies:

- companies required
- hr, organization, branches, facilities optional/recommended

## API Endpoints

- `GET/POST /api/v1/projects`
- `GET/PATCH/DELETE /api/v1/projects/{project_id}`
- `GET /api/v1/projects/{project_id}/summary`
- `GET /api/v1/projects/summary`
- `GET/POST /api/v1/tasks/project-tasks`
- `GET/PATCH/DELETE /api/v1/tasks/project-tasks/{task_id}`
- `POST /api/v1/tasks/project-tasks/{task_id}/transition`
- `POST /api/v1/tasks/project-tasks/{task_id}/assign`
- `GET/POST /api/v1/tasks/project-tasks/{task_id}/comments`
- `GET/POST /api/v1/tasks/project-tasks/{task_id}/attachments`
- `GET /api/v1/tasks/my-project-tasks`

## Acceptance Criteria

- Proje CRUD MVP calisir.
- Gorev CRUD MVP calisir.
- Status transition backend policy ile calisir.
- Kanban MVP acilir.
- Yorum ve ekler task detailde calisir.
- Related entity alanlari veri modelinde hazirdir.
- Project task Action Center'da `project_task` olarak gorunur.
- Process task ile project task ayrimi UI ve dokumanda nettir.
- FastAPI ve Next proxy coverage gunceldir.

## Known Gaps

Known gaps are tracked in [ProjectTaskKnownGaps.md](./ProjectTaskKnownGaps.md) and summarized in the final release gate risk list.
