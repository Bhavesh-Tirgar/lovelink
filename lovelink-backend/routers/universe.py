import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.universe import MemoryStar
from schemas.universe import StarCreate, StarResponse
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()


async def _get_user_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id)
        )
    )
    couple = result.scalars().first()
    if not couple:
        raise HTTPException(status_code=400, detail="You must be linked with a partner first")
    return couple


@router.get("/stars", response_model=list[StarResponse])
async def get_stars(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, str(current_user.id))
    result = await db.execute(
        select(MemoryStar).where(MemoryStar.couple_id == str(couple.id)).order_by(MemoryStar.created_at.desc())
    )
    stars = result.scalars().all()
    
    # Enrich with creator name
    responses = []
    for s in stars:
        resp = StarResponse.from_orm(s)
        resp.creator_name = current_user.name if str(s.creator_id) == str(current_user.id) else "Partner"
        responses.append(resp)
    return responses


@router.post("/stars", response_model=StarResponse)
async def create_star(
    payload: StarCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, str(current_user.id))
    
    # Generate spherical 3D coordinates if none provided
    cx = payload.coord_x if payload.coord_x is not None else round(random.uniform(-80.0, 80.0), 2)
    cy = payload.coord_y if payload.coord_y is not None else round(random.uniform(-80.0, 80.0), 2)
    cz = payload.coord_z if payload.coord_z is not None else round(random.uniform(-60.0, 60.0), 2)

    new_star = MemoryStar(
        couple_id=str(couple.id),
        creator_id=str(current_user.id),
        star_name=payload.star_name.strip(),
        memory_text=payload.memory_text.strip(),
        date_str=payload.date_str.strip() if payload.date_str else None,
        color=payload.color or "gold",
        coord_x=cx,
        coord_y=cy,
        coord_z=cz,
        brightness=payload.brightness or 1.0
    )
    db.add(new_star)
    await db.commit()
    await db.refresh(new_star)

    # Real-time alert to partner over WebSocket
    await manager.broadcast(str(couple.id), {
        "type": "star_pinned",
        "creator_name": current_user.name,
        "star": {
            "id": new_star.id,
            "star_name": new_star.star_name,
            "memory_text": new_star.memory_text,
            "date_str": new_star.date_str,
            "color": new_star.color,
            "coord_x": new_star.coord_x,
            "coord_y": new_star.coord_y,
            "coord_z": new_star.coord_z,
        }
    })

    resp = StarResponse.from_orm(new_star)
    resp.creator_name = current_user.name
    return resp


@router.delete("/stars/{star_id}")
async def delete_star(
    star_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, str(current_user.id))
    result = await db.execute(
        select(MemoryStar).where(MemoryStar.id == star_id, MemoryStar.couple_id == str(couple.id))
    )
    star = result.scalars().first()
    if not star:
        raise HTTPException(status_code=404, detail="Star not found")
        
    await db.delete(star)
    await db.commit()
    return {"deleted": True}
