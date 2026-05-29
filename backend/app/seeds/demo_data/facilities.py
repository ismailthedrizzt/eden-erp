from __future__ import annotations

from typing import Any

FACILITIES: list[dict[str, Any]] = [
    {
        "key": "eden_hq_facility",
        "company_key": "eden_tech",
        "branch_key": None,
        "facility_name": "EDEN Genel Merkez Ofisi",
        "facility_type": "headquarters",
        "city": "Ankara",
        "district": "Cankaya",
        "address": "Mustafa Kemal Mah. Demo Cad. No: 25",
        "status": "active",
        "record_status": "active",
        "scenario_key": "hq_facility",
    },
    {
        "key": "ankara_branch_facility",
        "company_key": "eden_tech",
        "branch_key": "ankara_branch",
        "facility_name": "Ankara Sube Lokasyonu",
        "facility_type": "branch_location",
        "city": "Ankara",
        "district": "Cankaya",
        "address": "Cankaya Demo Plaza Kat: 5",
        "status": "active",
        "record_status": "active",
        "scenario_key": "branch_facility",
    },
    {
        "key": "ostim_depo",
        "company_key": "glasstech",
        "branch_key": "ostim_ops_point",
        "facility_name": "Ostim Demo Depo",
        "facility_type": "warehouse",
        "city": "Ankara",
        "district": "Yenimahalle",
        "address": "Ostim OSB Demo Depo",
        "status": "active",
        "record_status": "active",
        "scenario_key": "warehouse_facility",
    },
    {
        "key": "reusable_training_room",
        "company_key": "eden_tech",
        "branch_key": None,
        "facility_name": "Paylasimli Egitim Salonu",
        "facility_type": "shared_space",
        "city": "Ankara",
        "district": "Cankaya",
        "address": "Demo Kampus B Blok",
        "status": "reusable",
        "record_status": "active",
        "scenario_key": "reusable_facility",
    },
]

