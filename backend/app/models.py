from enum import Enum as PyEnum

from sqlalchemy import (
    Column, Date, DateTime, Enum, ForeignKey, Integer, String, Table, Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base

VACATION_DAYS_PER_YEAR = 30

# Many-to-many: employee → managers
employee_managers = Table(
    "employee_managers",
    Base.metadata,
    Column("employee_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("manager_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)


class UserRole(str, PyEnum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class VacationStatus(str, PyEnum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class LeaveType(str, PyEnum):
    bezahlter_urlaub = "bezahlter_urlaub"
    elternzeit = "elternzeit"
    sonderurlaub_bezahlt = "sonderurlaub_bezahlt"
    sonderurlaub_unbezahlt = "sonderurlaub_unbezahlt"
    ueberstundenabbau = "ueberstundenabbau"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.employee)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vacation_requests = relationship(
        "VacationRequest", foreign_keys="VacationRequest.employee_id", back_populates="employee",
        passive_deletes=True,
    )
    reviewed_requests = relationship(
        "VacationRequest", foreign_keys="VacationRequest.reviewed_by_id", back_populates="reviewer",
        passive_deletes=True,
    )

    # employees that report to this manager
    subordinates = relationship(
        "User",
        secondary=employee_managers,
        primaryjoin=id == employee_managers.c.manager_id,
        secondaryjoin=id == employee_managers.c.employee_id,
        backref="managers",
    )


class VacationRequest(Base):
    __tablename__ = "vacation_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    working_days = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    leave_type = Column(String(50), nullable=False, server_default=LeaveType.bezahlter_urlaub)
    status = Column(Enum(VacationStatus), nullable=False, default=VacationStatus.pending)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    employee = relationship("User", foreign_keys=[employee_id], back_populates="vacation_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by_id], back_populates="reviewed_requests")
