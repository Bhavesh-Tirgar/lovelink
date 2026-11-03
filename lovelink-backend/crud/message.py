import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, update, desc, and_
from models.message import Message, MessageType
from datetime import datetime


async def get_messages(db: AsyncSession, couple_id: str, limit: int = 50, before_id: str = None):
    query = select(Message).options(joinedload(Message.sender)).where(Message.couple_id == couple_id)

    if before_id:
        result = await db.execute(select(Message.created_at).where(Message.id == before_id))
        ref_ts = result.scalar_one_or_none()
        if ref_ts:
            query = query.where(Message.created_at < ref_ts)

    query = query.order_by(desc(Message.created_at)).limit(limit)

    result = await db.execute(query)
    messages = list(result.scalars().all())
    messages.reverse()

    for msg in messages:
        msg.sender_name = msg.sender.name if msg.sender else "Unknown"
        msg.sender_photo = msg.sender.photo_url if msg.sender else None

    return messages


async def create_message(
    db: AsyncSession,
    couple_id: str,
    sender_id: str,
    text: str = None,
    message_type: MessageType = MessageType.text,
    file_url: str = None,
):
    new_message = Message(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        sender_id=sender_id,
        text=text,
        message_type=message_type,
        file_url=file_url,
    )
    db.add(new_message)
    await db.commit()

    # Single query with join — no extra refresh + re-query round-trip
    result = await db.execute(
        select(Message).options(joinedload(Message.sender)).where(Message.id == new_message.id)
    )
    msg = result.scalar_one()
    msg.sender_name = msg.sender.name if msg.sender else "Unknown"
    msg.sender_photo = msg.sender.photo_url if msg.sender else None

    return msg


async def mark_messages_read(db: AsyncSession, couple_id: str, reader_id: str):
    stmt = (
        update(Message)
        .where(
            and_(
                Message.couple_id == couple_id,
                Message.sender_id != reader_id,
                Message.read_at == None,
            )
        )
        .values(read_at=datetime.utcnow())
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
