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

_STATUS_DE = {
    "pending": "Beantragt",
    "approved": "Genehmigt",
    "rejected": "Abgelehnt",
}

_LEAVE_TYPE_DE = {
    "bezahlter_urlaub": "Bezahlter Urlaub",
    "elternzeit": "Elternzeit",
    "sonderurlaub_bezahlt": "Sonderurlaub (bezahlt)",
    "sonderurlaub_unbezahlt": "Sonderurlaub (unbezahlt)",
    "ueberstundenabbau": "Überstundenabbau",
}


def _fmt_dt(dt) -> str:
    if not dt:
        return ""
    return dt.strftime("%d.%m.%Y %H:%M")


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
    output.write("﻿")  # UTF-8 BOM — Excel reads umlauts correctly
    writer = csv.writer(output, delimiter=";")
    writer.writerow([
        "ID", "Mitarbeiter", "E-Mail", "Von", "Bis", "Arbeitstage",
        "Art", "Status", "Grund", "Geprüft von", "Geprüft am", "Erstellt am",
    ])
    for r in requests:
        reviewer_name = r.reviewer.full_name if r.reviewer else ""
        leave_type = _LEAVE_TYPE_DE.get(r.leave_type or "bezahlter_urlaub", r.leave_type or "")
        writer.writerow([
            r.id,
            r.employee.full_name,
            r.employee.email,
            r.start_date.strftime("%d.%m.%Y"),
            r.end_date.strftime("%d.%m.%Y"),
            r.working_days,
            leave_type,
            _STATUS_DE.get(r.status.value, r.status.value),
            r.reason or "",
            reviewer_name,
            _fmt_dt(r.reviewed_at),
            _fmt_dt(r.created_at),
        ])

    output.seek(0)
    filename = f"urlaub_{year}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
