# ruff: noqa: E501
from __future__ import annotations

CONTRACT_DOCUMENT_REQUIREMENTS = [
    {"operation_key": "activate_contract", "document_slot_key": "signed_contract", "document_type": "contract.signed_contract", "label": "İmzalı Sözleşme", "required": True},
    {"operation_key": "amend_contract", "document_slot_key": "amendment", "document_type": "contract.amendment", "label": "Ek Protokol", "required": True},
    {"operation_key": "terminate_contract", "document_slot_key": "termination_notice", "document_type": "contract.termination_notice", "label": "Fesih Bildirimi", "required": True},
    {"operation_key": "activate_contract", "document_slot_key": "guarantee_letter", "document_type": "contract.guarantee_letter", "label": "Teminat Mektubu", "required": False},
]
