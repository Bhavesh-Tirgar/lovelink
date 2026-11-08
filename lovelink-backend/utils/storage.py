import os
import io
import uuid
import boto3
from typing import Tuple, Optional
from fastapi import UploadFile

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
BASE_URL = os.getenv("API_BASE_URL", "https://lovelink-sfzx.onrender.com")

CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "lovelink")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")

s3_client = None
if CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_R2_ACCESS_KEY and CLOUDFLARE_R2_SECRET_KEY:
    try:
        s3_client = boto3.client(
            service_name="s3",
            endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
            aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
            region_name="auto",
        )
    except Exception as e:
        print(f"Failed to initialize S3/R2 client: {e}")

ALLOWED_EXTENSIONS = {
    # Images
    "jpg", "jpeg", "png", "gif", "webp",
    # Audio & Voice Notes
    "mp3", "wav", "m4a", "ogg", "webm",
    # Video
    "mp4", "mov", "avi",
    # Documents
    "pdf"
}

async def save_file(upload_file: UploadFile, subfolder: str = "chat") -> Tuple[str, Optional[str]]:
    """
    Saves an uploaded file either to R2 (if configured) or to local static uploads folder.
    Returns (file_url, thumbnail_url).
    """
    from fastapi import HTTPException
    ext = (upload_file.filename or "").rsplit(".", 1)[-1].lower() or "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '.{ext}' is not allowed for security reasons. Allowed: images, audio, video, pdf."
        )
    file_id = f"{uuid.uuid4().hex}.{ext}"
    object_key = f"{subfolder}/{file_id}"
    content_type = upload_file.content_type or "application/octet-stream"

    # Read binary contents
    file_bytes = await upload_file.read()

    # 1. Try Cloudflare R2 if configured
    if s3_client and R2_PUBLIC_URL:
        try:
            s3_client.upload_fileobj(
                io.BytesIO(file_bytes),
                R2_BUCKET_NAME,
                object_key,
                ExtraArgs={"ContentType": content_type}
            )
            file_url = f"{R2_PUBLIC_URL.rstrip('/')}/{object_key}"
            return file_url, None
        except Exception as e:
            print(f"R2 upload failed, falling back to local disk storage: {e}")

    # 2. Local Disk Storage (Served via /uploads FastAPI static mount)
    target_dir = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(target_dir, exist_ok=True)
    local_path = os.path.join(target_dir, file_id)

    with open(local_path, "wb") as f:
        f.write(file_bytes)

    file_url = f"{BASE_URL.rstrip('/')}/uploads/{subfolder}/{file_id}"

    # Generate thumbnail for images
    thumb_url = None
    if ext in {"jpg", "jpeg", "png", "gif", "webp"}:
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(file_bytes))
            img = img.convert("RGB")
            img.thumbnail((400, 400))
            
            thumb_dir = os.path.join(UPLOAD_DIR, "thumbnails")
            os.makedirs(thumb_dir, exist_ok=True)
            thumb_filename = f"thumb_{file_id.rsplit('.', 1)[0]}.jpg"
            thumb_path = os.path.join(thumb_dir, thumb_filename)
            
            img.save(thumb_path, format="JPEG", quality=80, optimize=True)
            thumb_url = f"{BASE_URL.rstrip('/')}/uploads/thumbnails/{thumb_filename}"
        except Exception as e:
            print(f"Thumbnail generation warning: {e}")

    return file_url, thumb_url
