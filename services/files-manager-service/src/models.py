from typing import Optional
from psycopg import Connection
from .db import get_conn

def insert_file(
    owner_user_id: str,
    original_name: str,
    content_type: str,
    size_bytes: int,
    object_key: str,
) -> dict:
    with get_conn() as conn:  # type: Connection
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO files (owner_user_id, original_name, content_type, size_bytes, object_key, status)
                VALUES (%s, %s, %s, %s, %s, 'PENDING')
                RETURNING *
                """,
                (owner_user_id, original_name, content_type, size_bytes, object_key),
            )
            row = cur.fetchone()
            return row

def get_file(file_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM files WHERE id=%s", (file_id,))
            return cur.fetchone()

def set_file_ready(file_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE files SET status='READY' WHERE id=%s RETURNING *",
                (file_id,),
            )
            return cur.fetchone()

def attach_file_to_project(file_id: str, project_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE files
                SET project_id = NULL
                WHERE project_id = %s
                  AND id <> %s
                """,
                (project_id, file_id),
            )

            cur.execute(
                """
                UPDATE files
                SET project_id = %s
                WHERE id = %s
                RETURNING *
                """,
                (project_id, file_id),
            )
            return cur.fetchone()


def mark_file_deleted(file_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE files SET status='DELETED' WHERE id=%s RETURNING *",
                (file_id,),
            )
            return cur.fetchone()