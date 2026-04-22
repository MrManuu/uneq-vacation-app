import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import require_manager
from app.database import get_db
from app.models import User, VacationRequest, VacationStatus

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/vacations.csv")
def export_vacations_csv(
    year: int = Query(default=date.today().year),
    status: VacationStatus | None = None,
    current_user: User = Depends(require_manager),
    db: Session = Depends(get_db),
):
    employee_ids = [u.id for u in current_user.subordinates]

    q = db.query(VacationRequest).filter(
        VacationRequest.employee_id.in_(employee_ids),
        VacationRequest.start_date >= date(year, 1, 1),
        VacationRequest.start_date <= date(year, 12, 31),
    )
    if status:
        q = q.filter(VacationRequest.status == status)

    requests = q.order_by(VacationRequest.start_date).all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "ID", "Mitarbeiter", "E-Mail", "Von", "Bis", "Arbeitstage",
        "Status", "Grund", "Geprüft von", "Geprüft am", "Erstellt am",
    ])
    for r in requests:
        reviewer_name = r.reviewer.full_name if r.reviewer else ""
        writer.writerow([
            r.id,
            r.employee.full_name,
            r.employee.email,
            r.start_date.isoformat(),
            r.end_date.isoformat(),
            r.working_days,
            r.status.value,
            r.reason or "",
            reviewer_name,
            r.reviewed_at.isoformat() if r.reviewed_at else "",
            r.created_at.isoformat(),
        ])

    output.seek(0)
    filename = f"urlaub_{year}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
