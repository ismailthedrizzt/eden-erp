from collections.abc import Iterator

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import settings

pool = ConnectionPool(conninfo=settings.database_url, kwargs={"row_factory": dict_row}, open=False)


def get_db() -> Iterator:
    if pool.closed:
        pool.open()
    with pool.connection() as conn:
        yield conn
