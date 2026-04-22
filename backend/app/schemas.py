from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from app.models import LeaveType, UserRole, VacationStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Users ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.employee


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None


class UserOut(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserWithManagers(UserOut):
    managers: list[UserOut] = []
    subordinates: list[UserOut] = []


# ── Vacations ─────────────────────────────────────────────────────────────────

class VacationRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None
    leave_type: LeaveType = LeaveType.bezahlter_urlaub

    @model_validator(mode="after")
    def end_after_start(self) -> "VacationRequestCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class VacationReview(BaseModel):
    status: VacationStatus
    # status must be approved or rejected
    @field_validator("status")
    @classmethod
    def must_be_decision(cls, v: VacationStatus) -> VacationStatus:
        if v == VacationStatus.pending:
            raise ValueError("Status must be approved or rejected")
        return v


class VacationRequestOut(BaseModel):
    id: int
    employee_id: int
    employee: UserOut
    start_date: date
    end_date: date
    working_days: int
    reason: Optional[str]
    leave_type: LeaveType
    status: VacationStatus
    reviewed_by_id: Optional[int]
    reviewer: Optional[UserOut]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RemainingDaysOut(BaseModel):
    year: int
    total_days: int
    used_days: int
    pending_days: int
    remaining_days: int


# ── Manager assignment ────────────────────────────────────────────────────────

class AssignManagersRequest(BaseModel):
    manager_ids: list[int]


# ── Password change ───────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
