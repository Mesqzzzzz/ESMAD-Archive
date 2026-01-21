from psycopg import Connection
from psycopg.rows import dict_row
from psycopg import connect
from .config import settings

def get_conn() -> Connection:
    return connect(settings.DATABASE_URL, row_factory=dict_row)
