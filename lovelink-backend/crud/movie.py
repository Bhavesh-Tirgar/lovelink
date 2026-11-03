import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select

from models.movie import Movie, SourceType
from models.watch_session import WatchSession


def _hydrate(m: Movie) -> Movie:
    m.adder_name = m.adder.name if m.adder else "Unknown"
    return m


async def create_movie(
    db: AsyncSession,
    couple_id: str,
    added_by: str,
    title: str,
    source_type: SourceType,
    file_url: Optional[str] = None,
    youtube_url: Optional[str] = None,
    youtube_id: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    duration_secs: Optional[int] = None,
    file_size_bytes: Optional[int] = None,
) -> Movie:
    movie = Movie(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        added_by=added_by,
        title=title,
        source_type=source_type,
        file_url=file_url,
        youtube_url=youtube_url,
        youtube_id=youtube_id,
        thumbnail_url=thumbnail_url,
        duration_secs=duration_secs,
        file_size_bytes=file_size_bytes,
    )
    db.add(movie)
    await db.commit()

    result = await db.execute(
        select(Movie).options(joinedload(Movie.adder)).where(Movie.id == movie.id)
    )
    return _hydrate(result.scalar_one())


async def get_movies(
    db: AsyncSession, couple_id: str, watched: Optional[bool] = None
) -> List[Movie]:
    q = (
        select(Movie)
        .options(joinedload(Movie.adder))
        .where(Movie.couple_id == couple_id)
    )
    if watched is True:
        q = q.where(Movie.watched_at.isnot(None))
    elif watched is False:
        q = q.where(Movie.watched_at.is_(None))
    q = q.order_by(Movie.created_at.desc())
    result = await db.execute(q)
    return [_hydrate(m) for m in result.scalars().all()]


async def get_movie(db: AsyncSession, movie_id: str) -> Movie:
    result = await db.execute(
        select(Movie).options(joinedload(Movie.adder)).where(Movie.id == movie_id)
    )
    movie = result.scalar_one_or_none()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return _hydrate(movie)


async def mark_watched(db: AsyncSession, movie_id: str, rating: Optional[int] = None) -> Movie:
    movie = await get_movie(db, movie_id)
    movie.watched_at = datetime.utcnow()
    if rating is not None:
        movie.rating = max(1, min(5, rating))
    await db.commit()
    await db.refresh(movie)
    return _hydrate(movie)


async def delete_movie(db: AsyncSession, movie_id: str, user_id: str) -> Movie:
    movie = await get_movie(db, movie_id)
    if str(movie.added_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Only the uploader can delete this movie")
    await db.delete(movie)
    await db.commit()
    return movie


async def get_or_create_session(
    db: AsyncSession, movie_id: str, couple_id: str, started_by: str
) -> WatchSession:
    result = await db.execute(
        select(WatchSession).where(WatchSession.movie_id == movie_id)
    )
    session = result.scalar_one_or_none()
    if session:
        return session

    session = WatchSession(
        id=str(uuid.uuid4()),
        movie_id=movie_id,
        couple_id=couple_id,
        current_position=0.0,
        is_playing=False,
        started_by=started_by,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def update_session(
    db: AsyncSession, session_id: str, position: float, is_playing: bool
) -> WatchSession:
    result = await db.execute(select(WatchSession).where(WatchSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.current_position = position
    session.is_playing = is_playing
    session.last_updated = datetime.utcnow()
    await db.commit()
    await db.refresh(session)
    return session
