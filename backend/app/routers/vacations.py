from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_manager
from app.database import get_db
from app.models import VACATION_DAYS_PER_YEAR, User, UserRole, VacationRequest, VacationStatus
from app.schemas import (
    RemainingDaysOut,
    VacationRequestCreate,
    VacationRequestOut,
    VacationReview,
)
from app.utils import count_working_days

router = APIRouter(prefix="/api/vacations", tags=["vacations"])


def _used_days(db: Session, employee_id: int, year: int, status_filter: list) -> int:
    requests = (
        db.query(VacationRequest)
        .filter(
            VacationRequest.employee_id == employee_id,
            VacationRequest.status.in_(status_filter),
            db.query(VacationRequest)
            .filter(
                VacationRequest.start_date >= date(year, 1, 1),
                VacationRequest.start_date <= date(year, 12, 31),
            )
            .exists()
            .correlate(VacationRequest),
        )
        .all()
    )
    # Simpler: just filter in Python after fetching
    return sum(
        r.working_days
        for r in requests
        if date(year, 1, 1) <= r.start_date <= date(year, 12, 31)
    )


def _calc_remaining(db: Session, employee_id: int, year: int) -> RemainingDaysOut:
    all_requests = (
        db.query(VacationRequest)
        .filter(
            VacationRequest.employee_id == employee_id,
            VacationRequest.start_date >= date(year, 1, 1),
            VacationRequest.start_date <= date(year, 12, 31),
        )
        .all()
    )
    used = sum(r.working_days for r in all_requests if r.status == VacationStatus.approved)
    pending = sum(r.working_days for r in all_requests if r.status == VacationStatus.pending)
    return RemainingDaysOut(
        year=year,
        total_days=VACATION_DAYS_PER_YEAR,
        used_days=used,
        pending_days=pending,
        remaining_days=VACATION_DAYS_PER_YEAR - used,
    )


@router.get("/remaining", response_model=RemainingDaysOut)
def get_remaining(
    year: int = Query(default=date.today().year),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _calc_remaining(db, current_user.id, year)


@router.get("/my", response_model=list[VacationRequestOut])
def my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(VacationRequest)
        .filter(VacationRequest.employee_id == current_user.id)
        .order_by(VacationRequest.created_at.desc())
        .all()
    )


@router.post("/", response_model=VacationRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(
    payload: VacationRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    working_days = count_working_days(payload.start_date, payload.end_date)
    if working_days == 0:
        raise HTTPException(status_code=400, detail="No working days in selected range")

    year = payload.start_date.year
    remaining = _calc_remaining(db, current_user.id, year)
    if working_days > remaining.remaining_days:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough vacation days. Remaining: {remaining.remaining_days}, requested: {working_days}",
        )

    is_manager = current_user.role in (UserRole.manager, UserRole.admin)
    req = VacationRequest(
        employee_id=current_user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        working_days=working_days,
        reason=payload.reason,
        status=VacationStatus.approved if is_manager else VacationStatus.pending,
        reviewed_by_id=current_user.id if is_manager else None,
        reviewed_at=datetime.now(timezone.utc) if is_manager else None,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.get(VacationRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    if req.status != VacationStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")
    db.delete(req)
    db.commit()


# ── Manager endpoints ──────────────────────────────────────────────────────────

@router.get("/all", response_model=list[VacationRequestOut])
def all_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(VacationRequest)
        .filter(VacationRequest.status.in_([VacationStatus.approved, VacationStatus.pending]))
        .order_by(VacationRequest.start_date)
        .all()
    )


@router.get("/team", response_model=list[VacationRequestOut])
def team_requests(
    status: VacationStatus | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.employee:
        team_ids: set[int] = {current_user.id}
        for manager in current_user.managers:
            team_ids.add(manager.id)
            for sub in manager.subordinates:
                team_ids.add(sub.id)
        employee_ids = list(team_ids)
    else:
        employee_ids = [u.id for u in current_user.subordinates] + [current_user.id]
    q = db.query(VacationRequest).filter(VacationRequest.employee_id.in_(employee_ids))
    if status:
        q = q.filter(VacationRequest.status == status)
    return q.order_by(VacationRequest.created_at.desc()).all()


@router.get("/team/remaining", response_model=list[dict])
def team_remaining(
    year: int = Query(default=date.today().year),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    members = db.query(User).order_by(User.full_name).all()
    result = []
    for emp in members:
        rem = _calc_remaining(db, emp.id, year)
        result.append({
            "employee": {"id": emp.id, "full_name": emp.full_name, "email": emp.email},
            **rem.model_dump(),
        })
    return result


@router.patch("/{request_id}/review", response_model=VacationRequestOut)
def review_request(
    request_id: int,
    payload: VacationReview,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    req = db.get(VacationRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    employee_ids = [u.id for u in current_user.subordinates]
    if req.employee_id not in employee_ids and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Not your employee")

    if req.status != VacationStatus.pending:
        raise HTTPException(status_code=400, detail="Request already reviewed")

    req.status = payload.status
    req.reviewed_by_id = current_user.id
    req.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(req)
    return req
