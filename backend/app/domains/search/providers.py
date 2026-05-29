# ruff: noqa: E501

from __future__ import annotations

from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.serialization import rows_to_dicts
from app.domains.operations.service import table_exists
from app.domains.reporting.reports import REPORT_DEFINITIONS
from app.domains.search.ranking import calculate_confidence, normalize
from app.domains.search.schemas import SearchRequest, SearchResult, SearchResultType
from app.policies.permissions import resolve_permission_with_fallback


class BaseSearchProvider:
    key = "base"
    module_key = "settings"
    entity_types: list[str] = []
    permission: str | None = None

    async def enabled(self, session: AsyncSession, context: dict[str, Any]) -> bool:
        return self.permission is None or permission_allowed(context, self.permission)

    async def search(
        self,
        session: AsyncSession,
        context: dict[str, Any],
        request: SearchRequest,
    ) -> list[SearchResult]:
        raise NotImplementedError


class CompanySearchProvider(BaseSearchProvider):
    key = "companies"
    module_key = "companies"
    entity_types = ["company"]
    permission = "companies.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.companies"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "c.id")
        rows = await select_rows(
            session,
            f"""
            select c.id::text, c.trade_name, c.short_name, c.tax_number, c.tax_office,
                   c.city, c.district, coalesce(c.record_status, c.company_status, 'draft') as status
            from public.companies c
            where c.tenant_id = :tenant_id
              and coalesce(c.is_deleted, false) = false
              {scope_sql}
              and (
                c.id::text = :exact
                or c.trade_name ilike :like
                or c.short_name ilike :like
                or c.tax_number ilike :like
                or c.tax_office ilike :like
                or c.city ilike :like
                or c.email ilike :like
                or c.phone ilike :like
              )
            order by c.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="company",
                module_key=self.module_key,
                title=str(row.get("trade_name") or row.get("short_name") or "Sirket"),
                subtitle=join_parts([row.get("short_name"), row.get("city"), row.get("tax_number")]),
                status=str(row.get("status") or ""),
                badge="Sirket",
                icon="Building2",
                target_page=f"/app/sirket/companies?id={row['id']}",
                fields={
                    "id": row.get("id"),
                    "title": row.get("trade_name"),
                    "short_name": row.get("short_name"),
                    "tax_number": row.get("tax_number"),
                    "city": row.get("city"),
                },
            )
            for row in rows
        ]


class BranchSearchProvider(BaseSearchProvider):
    key = "branches"
    module_key = "branches"
    entity_types = ["branch"]
    permission = "branches.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.company_branches"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "b.company_id")
        branch_scope_sql, branch_scope_params = branch_scope_clause(context, "b.id")
        rows = await select_rows(
            session,
            f"""
            select b.id::text, b.company_id::text, b.branch_name, b.branch_short_name,
                   b.city, b.district, b.address, b.trade_registry_number,
                   coalesce(b.record_status, b.status, 'active') as status,
                   c.trade_name as company_name
            from public.company_branches b
            left join public.companies c on c.id = b.company_id and c.tenant_id = b.tenant_id
            where b.tenant_id = :tenant_id
              and coalesce(b.is_deleted, false) = false
              {scope_sql}
              {branch_scope_sql}
              and (
                b.id::text = :exact
                or b.branch_name ilike :like
                or b.branch_short_name ilike :like
                or b.city ilike :like
                or b.district ilike :like
                or b.address ilike :like
                or b.trade_registry_number ilike :like
                or c.trade_name ilike :like
              )
            order by b.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params | branch_scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="branch",
                module_key=self.module_key,
                title=str(row.get("branch_name") or "Sube"),
                subtitle=join_parts([row.get("company_name"), row.get("status"), row.get("district"), row.get("city")]),
                status=str(row.get("status") or ""),
                badge="Sube",
                icon="GitBranch",
                target_page=f"/app/sirket/companies/branches?id={row['id']}",
                fields={
                    "id": row.get("id"),
                    "title": row.get("branch_name"),
                    "branch_short_name": row.get("branch_short_name"),
                    "company_name": row.get("company_name"),
                    "city": row.get("city"),
                },
            )
            for row in rows
        ]


class PartnerSearchProvider(BaseSearchProvider):
    key = "partners"
    module_key = "partners"
    entity_types = ["partner"]
    permission = "partners.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.company_partners"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "p.company_id")
        rows = await select_rows(
            session,
            f"""
            select p.id::text, p.company_id::text, p.display_name, p.first_name, p.last_name,
                   p.trade_name, p.tax_number, p.identity_number, p.email, p.phone,
                   coalesce(p.record_status, p.status, 'draft') as status,
                   c.trade_name as company_name
            from public.company_partners p
            left join public.companies c on c.id = p.company_id and c.tenant_id = p.tenant_id
            where p.tenant_id = :tenant_id
              and coalesce(p.is_deleted, false) = false
              {scope_sql}
              and (
                p.id::text = :exact
                or p.display_name ilike :like
                or p.first_name ilike :like
                or p.last_name ilike :like
                or p.trade_name ilike :like
                or p.tax_number = :exact
                or p.identity_number = :exact
                or p.email ilike :like
                or p.phone ilike :like
                or c.trade_name ilike :like
              )
            order by p.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="partner",
                module_key=self.module_key,
                title=str(row.get("display_name") or row.get("trade_name") or "Ortak"),
                subtitle=join_parts([row.get("company_name"), row.get("status"), row.get("email")]),
                status=str(row.get("status") or ""),
                badge="Ortak",
                icon="Users",
                target_page=f"/app/sirket/companies/partners?id={row['id']}",
                fields={
                    "id": row.get("id"),
                    "title": row.get("display_name") or row.get("trade_name"),
                    "tax_number": row.get("tax_number"),
                    "identity_number": row.get("identity_number"),
                    "email": row.get("email"),
                },
            )
            for row in rows
        ]


class RepresentativeSearchProvider(BaseSearchProvider):
    key = "representatives"
    module_key = "representatives"
    entity_types = ["representative"]
    permission = "representatives.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.company_representatives"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "r.company_id")
        rows = await select_rows(
            session,
            f"""
            select r.id::text, r.company_id::text, r.display_name, r.full_name,
                   r.job_title, r.email, r.phone, coalesce(r.record_status, r.status, 'draft') as status,
                   c.trade_name as company_name
            from public.company_representatives r
            left join public.companies c on c.id = r.company_id and c.tenant_id = r.tenant_id
            where r.tenant_id = :tenant_id
              and coalesce(r.is_deleted, false) = false
              {scope_sql}
              and (
                r.id::text = :exact
                or r.display_name ilike :like
                or r.full_name ilike :like
                or r.job_title ilike :like
                or r.email ilike :like
                or r.phone ilike :like
                or c.trade_name ilike :like
              )
            order by r.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="representative",
                module_key=self.module_key,
                title=str(row.get("display_name") or row.get("full_name") or "Temsilci"),
                subtitle=join_parts([row.get("company_name"), row.get("job_title"), row.get("status")]),
                status=str(row.get("status") or ""),
                badge="Temsilci",
                icon="BadgeCheck",
                target_page=f"/app/sirket/companies/representatives?id={row['id']}",
                fields={"id": row.get("id"), "title": row.get("display_name") or row.get("full_name"), "job_title": row.get("job_title")},
            )
            for row in rows
        ]


class AccountingSearchProvider(BaseSearchProvider):
    key = "accounting"
    module_key = "accounting"
    entity_types = ["cari_account", "cari_transaction"]
    permission = "accounting.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        results: list[SearchResult] = []
        if await table_exists(session, "public.accounting_cari_accounts"):
            scope_sql, scope_params = company_scope_clause(context, "a.company_id")
            rows = await select_rows(
                session,
                f"""
                select a.id::text, a.company_id::text, a.account_code, a.account_name,
                       a.cari_role, a.tax_number, a.city, a.record_status as status
                from public.accounting_cari_accounts a
                where a.tenant_id = :tenant_id
                  and coalesce(a.is_deleted, false) = false
                  {scope_sql}
                  and (
                    a.id::text = :exact
                    or a.account_code ilike :like
                    or a.account_name ilike :like
                    or a.tax_number = :exact
                    or a.city ilike :like
                  )
                order by a.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="cari_account",
                    module_key=self.module_key,
                    title=str(row.get("account_name") or row.get("account_code") or "Cari kart"),
                    subtitle=join_parts([row.get("account_code"), row.get("cari_role"), row.get("tax_number")]),
                    status=str(row.get("status") or ""),
                    badge="Cari",
                    icon="WalletCards",
                    target_page=f"/app/muhasebe/cari-kartlar?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("account_code"), "title": row.get("account_name"), "tax_number": row.get("tax_number")},
                )
                for row in rows
            )
        if await table_exists(session, "public.accounting_cari_transactions"):
            scope_sql, scope_params = company_scope_clause(context, "t.company_id")
            rows = await select_rows(
                session,
                f"""
                select t.id::text, t.company_id::text, t.document_no, t.description,
                       t.real_counterparty_name, t.transaction_type, t.document_status,
                       t.status, t.transaction_date
                from public.accounting_cari_transactions t
                where t.tenant_id = :tenant_id
                  and coalesce(t.is_deleted, false) = false
                  {scope_sql}
                  and (
                    t.id::text = :exact
                    or t.document_no ilike :like
                    or t.description ilike :like
                    or t.real_counterparty_name ilike :like
                    or t.document_status ilike :like
                  )
                order by t.transaction_date desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="cari_transaction",
                    module_key=self.module_key,
                    title=str(row.get("description") or row.get("document_no") or "Cari hareket"),
                    subtitle=join_parts([row.get("document_no"), row.get("real_counterparty_name"), row.get("document_status")]),
                    status=str(row.get("status") or row.get("document_status") or ""),
                    badge="Cari hareket",
                    icon="ReceiptText",
                    target_page=f"/app/muhasebe/cari-hareketler?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("document_no"), "title": row.get("description"), "counterparty": row.get("real_counterparty_name")},
                )
                for row in rows
            )
        return results


class HRSearchProvider(BaseSearchProvider):
    key = "hr"
    module_key = "hr"
    entity_types = ["employee"]
    permission = "hr.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.hr_employees"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "e.company_id")
        rows = await select_rows(
            session,
            f"""
            select e.id::text, e.company_id::text, e.employee_no, e.full_name,
                   e.email, e.phone, e.identity_number, e.record_status, e.employment_status
            from public.hr_employees e
            where e.tenant_id = :tenant_id
              and coalesce(e.is_deleted, false) = false
              {scope_sql}
              and (
                e.id::text = :exact
                or e.employee_no ilike :like
                or e.full_name ilike :like
                or e.email ilike :like
                or e.phone ilike :like
                or e.identity_number = :exact
              )
            order by e.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="employee",
                module_key=self.module_key,
                title=str(row.get("full_name") or row.get("employee_no") or "Calisan"),
                subtitle=join_parts([row.get("employee_no"), row.get("employment_status"), row.get("email")]),
                status=str(row.get("employment_status") or row.get("record_status") or ""),
                badge="Calisan",
                icon="UserRound",
                target_page=f"/app/ik/calisanlar?id={row['id']}",
                fields={"id": row.get("id"), "code": row.get("employee_no"), "title": row.get("full_name"), "identity_number": row.get("identity_number")},
            )
            for row in rows
        ]


class ProjectTaskSearchProvider(BaseSearchProvider):
    key = "project_tasks"
    module_key = "project_management"
    entity_types = ["project", "task"]
    permission = "tasks.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        results: list[SearchResult] = []
        if await table_exists(session, "public.project_tasks"):
            scope_sql, scope_params = company_scope_clause(context, "t.company_id")
            rows = await select_rows(
                session,
                f"""
                select t.id::text, t.company_id::text, t.issue_key, t.title,
                       t.issue_type, t.status, t.priority, t.due_date
                from public.project_tasks t
                where t.tenant_id = :tenant_id
                  and coalesce(t.is_deleted, false) = false
                  {scope_sql}
                  and (
                    t.id::text = :exact
                    or t.issue_key ilike :like
                    or t.title ilike :like
                    or t.description ilike :like
                    or array_to_string(t.labels, ' ') ilike :like
                  )
                order by t.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="task",
                    entity_type="task",
                    module_key=self.module_key,
                    title=str(row.get("title") or row.get("issue_key") or "Gorev"),
                    subtitle=join_parts([row.get("issue_key"), row.get("status"), row.get("priority")]),
                    status=str(row.get("status") or ""),
                    badge="Gorev",
                    icon="ListChecks",
                    target_page=f"/app/gorev-ve-proje-yonetimi/gorevler?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("issue_key"), "title": row.get("title"), "status": row.get("status")},
                )
                for row in rows
            )
        if await table_exists(session, "public.project_projects"):
            scope_sql, scope_params = company_scope_clause(context, "p.company_id")
            rows = await select_rows(
                session,
                f"""
                select p.id::text, p.company_id::text, p.project_key, p.project_name,
                       p.project_type, p.status, p.priority
                from public.project_projects p
                where p.tenant_id = :tenant_id
                  and coalesce(p.is_deleted, false) = false
                  {scope_sql}
                  and (
                    p.id::text = :exact
                    or p.project_key ilike :like
                    or p.project_name ilike :like
                    or p.description ilike :like
                  )
                order by p.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="project",
                    module_key=self.module_key,
                    title=str(row.get("project_name") or row.get("project_key") or "Proje"),
                    subtitle=join_parts([row.get("project_key"), row.get("project_type"), row.get("status")]),
                    status=str(row.get("status") or ""),
                    badge="Proje",
                    icon="FolderKanban",
                    target_page=f"/app/gorev-ve-proje-yonetimi/projeler?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("project_key"), "title": row.get("project_name")},
                )
                for row in rows
            )
        return results


class ProductAfterSalesSearchProvider(BaseSearchProvider):
    key = "product_after_sales"
    module_key = "after_sales"
    entity_types = ["product", "installed_asset", "service_request", "service_record"]
    permission = "afterSales.view"

    async def enabled(self, session: AsyncSession, context: dict[str, Any]) -> bool:
        return permission_allowed(context, "afterSales.view") or permission_allowed(context, "products.view")

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        results: list[SearchResult] = []
        if await table_exists(session, "public.product_catalog") and permission_allowed(context, "products.view"):
            rows = await select_rows(
                session,
                """
                select p.id::text, p.company_id::text, p.product_code, p.product_name,
                       p.product_type, p.brand, p.model, case when p.active then 'active' else 'passive' end as status
                from public.product_catalog p
                where p.tenant_id = :tenant_id
                  and coalesce(p.is_deleted, false) = false
                  and (
                    p.id::text = :exact
                    or p.product_code ilike :like
                    or p.product_name ilike :like
                    or p.brand ilike :like
                    or p.model ilike :like
                  )
                order by p.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request),
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="product",
                    module_key="product_services",
                    title=str(row.get("product_name") or row.get("product_code") or "Urun"),
                    subtitle=join_parts([row.get("product_code"), row.get("brand"), row.get("model")]),
                    status=str(row.get("status") or ""),
                    badge="Urun",
                    icon="Package",
                    target_page=f"/app/urun-ve-hizmetler/katalog?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("product_code"), "title": row.get("product_name"), "brand": row.get("brand"), "model": row.get("model")},
                )
                for row in rows
            )
        if await table_exists(session, "public.after_sales_installed_assets"):
            scope_sql, scope_params = company_scope_clause(context, "a.owning_company_id")
            rows = await select_rows(
                session,
                f"""
                select a.id::text, a.owning_company_id::text as company_id, a.customer_name,
                       a.product_code, a.product_name, a.serial_no, a.asset_tag,
                       a.warranty_status, a.status
                from public.after_sales_installed_assets a
                where a.tenant_id = :tenant_id
                  and coalesce(a.is_deleted, false) = false
                  {scope_sql}
                  and (
                    a.id::text = :exact
                    or a.product_code ilike :like
                    or a.product_name ilike :like
                    or a.serial_no = :exact
                    or a.asset_tag ilike :like
                    or a.customer_name ilike :like
                  )
                order by a.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="installed_asset",
                    module_key="after_sales",
                    title=str(row.get("product_name") or row.get("serial_no") or "Kurulu urun"),
                    subtitle=join_parts([row.get("serial_no"), row.get("asset_tag"), row.get("customer_name")]),
                    status=str(row.get("status") or row.get("warranty_status") or ""),
                    badge="Kurulu urun",
                    icon="Cpu",
                    target_page=f"/app/satis-sonrasi/musterideki-urunler?id={row['id']}",
                    fields={"id": row.get("id"), "serial_no": row.get("serial_no"), "code": row.get("product_code"), "title": row.get("product_name"), "customer": row.get("customer_name")},
                )
                for row in rows
            )
        if await table_exists(session, "public.after_sales_service_requests"):
            scope_sql, scope_params = company_scope_clause(context, "s.company_id")
            rows = await select_rows(
                session,
                f"""
                select s.id::text, s.company_id::text, s.request_no, s.customer_name,
                       s.subject, s.priority, s.status, s.due_date
                from public.after_sales_service_requests s
                where s.tenant_id = :tenant_id
                  and coalesce(s.is_deleted, false) = false
                  {scope_sql}
                  and (
                    s.id::text = :exact
                    or s.request_no ilike :like
                    or s.customer_name ilike :like
                    or s.subject ilike :like
                    or s.description ilike :like
                  )
                order by s.updated_at desc nulls last
                limit :limit
                """,
                base_params(context, request) | scope_params,
            )
            results.extend(
                build_result(
                    request,
                    row,
                    result_type="record",
                    entity_type="service_request",
                    module_key="after_sales",
                    title=str(row.get("subject") or row.get("request_no") or "Servis talebi"),
                    subtitle=join_parts([row.get("request_no"), row.get("customer_name"), row.get("priority")]),
                    status=str(row.get("status") or ""),
                    badge="Servis talebi",
                    icon="Wrench",
                    target_page=f"/app/satis-sonrasi/servis-talepleri?id={row['id']}",
                    fields={"id": row.get("id"), "code": row.get("request_no"), "title": row.get("subject"), "customer": row.get("customer_name")},
                )
                for row in rows
            )
        return results


class CRMSearchProvider(BaseSearchProvider):
    key = "crm"
    module_key = "crm"
    entity_types = ["stakeholder"]
    permission = "crm.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.crm_stakeholders"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "s.company_id")
        rows = await select_rows(
            session,
            f"""
            select s.id::text, s.company_id::text, s.display_name, s.stakeholder_type,
                   s.relationship_status, s.customer_status, s.supplier_status,
                   s.lead_status, array_to_string(s.tags, ' ') as tags
            from public.crm_stakeholders s
            where s.tenant_id = :tenant_id
              and coalesce(s.is_deleted, false) = false
              {scope_sql}
              and (
                s.id::text = :exact
                or s.display_name ilike :like
                or s.stakeholder_type ilike :like
                or s.lead_status ilike :like
                or array_to_string(s.tags, ' ') ilike :like
              )
            order by s.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="stakeholder",
                module_key=self.module_key,
                title=str(row.get("display_name") or "Paydas"),
                subtitle=join_parts([row.get("stakeholder_type"), row.get("relationship_status"), row.get("lead_status")]),
                status=str(row.get("relationship_status") or row.get("customer_status") or row.get("supplier_status") or ""),
                badge="Paydas",
                icon="Handshake",
                target_page=f"/app/crm/paydaslar?id={row['id']}",
                fields={"id": row.get("id"), "title": row.get("display_name"), "type": row.get("stakeholder_type"), "tags": row.get("tags")},
            )
            for row in rows
        ]


class DocumentSearchProvider(BaseSearchProvider):
    key = "documents"
    module_key = "documents"
    entity_types = ["document"]
    permission = "documents.view"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.documents"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "d.company_id", allow_null=True)
        rows = await select_rows(
            session,
            f"""
            select d.id::text, d.company_id::text, d.owner_entity_type, d.owner_entity_id,
                   d.document_type, d.document_category, d.title, d.file_name,
                   d.status, d.verification_status, d.expiry_date, array_to_string(d.tags, ' ') as tags
            from public.documents d
            where d.tenant_id = :tenant_id
              and coalesce(d.is_deleted, false) = false
              {scope_sql}
              and (
                d.id::text = :exact
                or d.title ilike :like
                or d.file_name ilike :like
                or d.document_type ilike :like
                or d.document_category ilike :like
                or d.owner_entity_type ilike :like
                or array_to_string(d.tags, ' ') ilike :like
              )
            order by d.updated_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="document",
                entity_type="document",
                module_key=self.module_key,
                title=str(row.get("title") or row.get("file_name") or "Belge"),
                subtitle=join_parts([row.get("document_type"), row.get("owner_entity_type"), row.get("verification_status")]),
                status=str(row.get("status") or ""),
                badge="Belge",
                icon="FileText",
                target_page=f"/app/belgeler?id={row['id']}",
                fields={"id": row.get("id"), "title": row.get("title"), "file_name": row.get("file_name"), "document_type": row.get("document_type"), "tags": row.get("tags")},
            )
            for row in rows
        ]


class AuditSearchProvider(BaseSearchProvider):
    key = "audit"
    module_key = "audit"
    entity_types = ["audit_log"]
    permission = "audit.view"

    async def enabled(self, session: AsyncSession, context: dict[str, Any]) -> bool:
        return permission_allowed(context, "audit.view") or permission_allowed(context, "reporting.viewAuditSummary")

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        if not await table_exists(session, "public.audit_logs"):
            return []
        scope_sql, scope_params = company_scope_clause(context, "a.company_id", allow_null=True)
        rows = await select_rows(
            session,
            f"""
            select a.id::text, a.company_id::text, a.module_key, a.entity_type,
                   a.entity_id, a.action_type, a.action_key, a.operation_id::text,
                   a.summary, a.result_status, a.severity, a.created_at
            from public.audit_logs a
            where a.tenant_id = :tenant_id
              {scope_sql}
              and (
                a.id::text = :exact
                or a.operation_id::text = :exact
                or a.entity_id::text = :exact
                or a.summary ilike :like
                or a.action_type ilike :like
                or a.action_key ilike :like
                or a.entity_type ilike :like
              )
            order by a.created_at desc nulls last
            limit :limit
            """,
            base_params(context, request) | scope_params,
        )
        return [
            build_result(
                request,
                row,
                result_type="record",
                entity_type="audit_log",
                module_key="audit",
                title=str(row.get("summary") or row.get("action_type") or "Audit kaydi"),
                subtitle=join_parts([row.get("module_key"), row.get("entity_type"), row.get("result_status")]),
                status=str(row.get("severity") or row.get("result_status") or ""),
                badge="Audit",
                icon="ShieldCheck",
                target_page=f"/app/sistem/audit?id={row['id']}",
                fields={"id": row.get("id"), "operation_id": row.get("operation_id"), "title": row.get("summary"), "action_type": row.get("action_type"), "entity_type": row.get("entity_type")},
            )
            for row in rows
        ]


class ReportSearchProvider(BaseSearchProvider):
    key = "reports"
    module_key = "reporting"
    entity_types = ["report"]
    permission = "reporting.export"

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        results: list[SearchResult] = []
        for report_key, item in REPORT_DEFINITIONS.items():
            permission = str(item.get("permission") or "reporting.export")
            if not (permission_allowed(context, permission) or permission_allowed(context, "reporting.admin")):
                continue
            title = str(item["title"])
            description = f"{title} raporunu ac veya disa aktar."
            if request.query and normalize(request.query) not in normalize(" ".join([report_key, title, description, str(item.get("module_key") or "")])):
                continue
            confidence, fields = calculate_confidence(
                request.query,
                title=title,
                fields={"report_key": report_key, "title": title, "module_key": item.get("module_key")},
                current_page=request.current_page,
                target_page="/app/sistem/export",
            )
            results.append(
                SearchResult(
                    id=f"report:{report_key}",
                    result_type="report",
                    entity_type="report",
                    entity_id=report_key,
                    module_key=str(item.get("module_key") or "reporting"),
                    title=title,
                    subtitle=str(item.get("module_key") or "Raporlama"),
                    description=description,
                    badge="Rapor",
                    icon="BarChart3",
                    target_page=f"/app/sistem/export?report_key={report_key}",
                    confidence=confidence,
                    matched_fields=fields,
                )
            )
        return results[: request.limit]


class ModuleSettingsSearchProvider(BaseSearchProvider):
    key = "settings"
    module_key = "settings"
    entity_types = ["setting", "page", "help"]
    permission = None

    async def search(self, session: AsyncSession, context: dict[str, Any], request: SearchRequest) -> list[SearchResult]:
        rows = [
            ("admin_console", "Admin Console", "Calisma alani, moduller, ozellikler, saglik ve entegrasyon ayarlari.", "setting", "Settings", "/app/sistem", "adminConsole"),
            ("workspace_settings", "Genel Ayarlar", "Dil, para birimi, zaman dilimi ve calisma alani profili.", "setting", "SlidersHorizontal", "/app/sistem/genel", "adminConsole"),
            ("system_health", "Sistem Sagligi", "FastAPI, DB, storage, outbox, email ve worker durumunu izle.", "setting", "Activity", "/app/sistem/saglik", "adminConsole"),
            ("admin_features", "Ozellik Ayarlari", "Feature flag ve riskli ozellik ayarlarini yonet.", "setting", "Flag", "/app/sistem/ozellikler", "adminConsole"),
            ("setup", "Kurulum Merkezi", "Modul hazirligi ve kurulum adimlari.", "setting", "Settings", "/app/sistem/kurulum", "settings"),
            ("module_licenses", "Modul Lisanslari", "Lisans ve runtime visibility ayarlari.", "setting", "BadgeCheck", "/app/sistem/module-licenses", "settings"),
            ("notification_settings", "Bildirim Ayarlari", "Kullanici bildirim tercihleri.", "setting", "Bell", "/app/ayarlar/bildirimler", "notifications"),
            ("email_admin", "Sistem E-postalari", "Email queue ve hata yonetimi.", "setting", "Mail", "/app/sistem/e-postalar", "notifications"),
            ("help", "Yardim Merkezi", "Sistem mantigi, turlar ve Action Guide.", "help", "CircleHelp", "/app/yardim", "settings"),
            ("onboarding", "Baslangic Merkezi", "Ilk kurulum checklist ve ilk sirket akisina don.", "help", "Compass", "/app/onboarding", "settings"),
        ]
        results: list[SearchResult] = []
        for key, title, description, result_type, icon, target_page, module_key in rows:
            if request.query and normalize(request.query) not in normalize(" ".join([key, title, description])):
                continue
            confidence, fields = calculate_confidence(
                request.query,
                title=title,
                fields={"key": key, "title": title, "description": description},
                current_page=request.current_page,
                target_page=target_page,
            )
            results.append(
                SearchResult(
                    id=f"{result_type}:{key}",
                    result_type=cast(SearchResultType, result_type),
                    entity_type=result_type,
                    entity_id=key,
                    module_key=module_key,
                    title=title,
                    subtitle=description,
                    badge="Ayar" if result_type == "setting" else "Yardim",
                    icon=icon,
                    target_page=target_page,
                    confidence=confidence,
                    matched_fields=fields,
                )
            )
        return results


def permission_allowed(context: dict[str, Any], permission_key: str) -> bool:
    permissions = {str(item) for item in context.get("permissions") or []}
    if "*" in permissions or "system.admin" in permissions:
        return True
    return bool(permissions.intersection(resolve_permission_with_fallback(permission_key)))


def base_params(context: dict[str, Any], request: SearchRequest) -> dict[str, Any]:
    query = request.query.strip()
    return {
        "tenant_id": context["tenant_id"],
        "exact": query,
        "like": f"%{query}%",
        "limit": min(max(request.limit, 1), 10),
    }


def company_scope_clause(
    context: dict[str, Any],
    column: str,
    *,
    allow_null: bool = False,
) -> tuple[str, dict[str, Any]]:
    if context.get("company_scope_ids") is None:
        return "", {}
    scope = [str(item) for item in context.get("company_scope_ids") or []]
    if not scope:
        return "and 1 = 0", {}
    null_part = f"{column} is null or " if allow_null else ""
    return f"and ({null_part}{column}::text = any(:company_scope_ids))", {"company_scope_ids": scope}


def branch_scope_clause(context: dict[str, Any], column: str) -> tuple[str, dict[str, Any]]:
    if context.get("branch_scope_ids") is None:
        return "", {}
    scope = [str(item) for item in context.get("branch_scope_ids") or []]
    if not scope:
        return "and 1 = 0", {}
    return f"and {column}::text = any(:branch_scope_ids)", {"branch_scope_ids": scope}


async def select_rows(
    session: AsyncSession,
    sql: str,
    params: dict[str, Any],
) -> list[dict[str, Any]]:
    result = await session.execute(text(sql), params)
    return rows_to_dicts(result.mappings().all())


def build_result(
    request: SearchRequest,
    row: dict[str, Any],
    *,
    result_type: SearchResultType,
    entity_type: str,
    module_key: str,
    title: str,
    subtitle: str | None,
    status: str,
    badge: str,
    icon: str,
    target_page: str,
    fields: dict[str, object],
) -> SearchResult:
    confidence, matched_fields = calculate_confidence(
        request.query,
        title=title,
        fields=fields,
        current_page=request.current_page,
        target_page=target_page,
    )
    return SearchResult(
        id=f"{entity_type}:{row.get('id')}",
        result_type=result_type,
        entity_type=entity_type,
        entity_id=str(row.get("id")),
        module_key=module_key,
        title=title,
        subtitle=subtitle,
        status=status,
        badge=badge,
        icon=icon,
        target_page=target_page,
        confidence=confidence,
        matched_fields=matched_fields,
        metadata={"company_id": row.get("company_id")},
    )


def join_parts(parts: list[object | None]) -> str | None:
    values = [str(part) for part in parts if part not in (None, "")]
    return " · ".join(values) if values else None
