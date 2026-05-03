from fastapi import APIRouter, Depends, HTTPException

from app.services.module_service import require_module_enabled
from app.services.permission_service import require_permission

router = APIRouter()


@router.get("/status", dependencies=[Depends(require_module_enabled("workflow")), Depends(require_permission("workflow.view"))])
def workflow_status() -> dict[str, str]:
    return {"status": "stub", "message": "Workflow definitions and requests are modeled; execution is planned for a later phase."}


@router.post("/{request_id}/approve", dependencies=[Depends(require_module_enabled("workflow", write=True)), Depends(require_permission("workflow.approve"))])
def approve_request(request_id: str) -> dict:
    raise HTTPException(status_code=501, detail={"code": "WORKFLOW_STUB", "message": f"Approval stub for {request_id}"})
