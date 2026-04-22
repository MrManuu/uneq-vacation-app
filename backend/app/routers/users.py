from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, require_admin, verify_password
from app.database import get_db
from app.models import User, UserRole
from app.schemas import AssignManagersRequest, ChangePasswordRequest, UserCreate, UserOut, UserUpdate, UserWithManagers

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserWithManagers)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role_order = {UserRole.admin: 0, UserRole.manager: 1, UserRole.employee: 2}
    users = db.query(User).all()
    return sorted(users, key=lambda u: (role_order[u.role], u.full_name))


@router.get("/employees", response_model=list[UserOut])
def list_employees(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).filter(User.role == UserRole.employee).all()


@router.get("/managers", response_model=list[UserOut])
def list_managers(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(User).filter(User.role.in_([UserRole.manager, UserRole.admin])).all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.managers = []
    user.subordinates = []
    db.flush()
    db.delete(user)
    db.commit()


@router.put("/{user_id}/managers", response_model=UserWithManagers)
def assign_managers(
    user_id: int,
    payload: AssignManagersRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    managers = db.query(User).filter(
        User.id.in_(payload.manager_ids),
        User.role.in_([UserRole.manager, UserRole.admin]),
    ).all()

    if len(managers) != len(payload.manager_ids):
        raise HTTPException(status_code=400, detail="One or more manager IDs are invalid")

    user.managers = managers
    db.commit()
    db.refresh(user)
    return user
