from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from pydantic import BaseModel


class Repository:
    """Small owner-scoped SQLite JSON repository for the single-user judging build."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS records (
                    record_type TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (record_type, record_id, owner_id)
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_records_owner_type ON records(owner_id, record_type)"
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS idempotency (
                    owner_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    PRIMARY KEY (owner_id, action, idempotency_key)
                )
                """
            )

    @staticmethod
    def _dump(value: BaseModel | dict[str, Any]) -> str:
        if isinstance(value, BaseModel):
            data: Any = value.model_dump(mode="json")
        else:
            data = value
        return json.dumps(data, separators=(",", ":"), sort_keys=True)

    def put(
        self,
        record_type: str,
        record_id: str,
        owner_id: str,
        payload: BaseModel | dict[str, Any],
        now: str,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO records(record_type, record_id, owner_id, payload_json, created_at, updated_at)
                VALUES(?, ?, ?, ?, ?, ?)
                ON CONFLICT(record_type, record_id, owner_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (record_type, record_id, owner_id, self._dump(payload), now, now),
            )

    def get(self, record_type: str, record_id: str, owner_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM records WHERE record_type=? AND record_id=? AND owner_id=?",
                (record_type, record_id, owner_id),
            ).fetchone()
        return json.loads(row["payload_json"]) if row else None

    def list(
        self,
        record_type: str,
        owner_id: str,
        *,
        include_inactive: bool = True,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT payload_json FROM records WHERE record_type=? AND owner_id=? ORDER BY created_at DESC LIMIT ?",
                (record_type, owner_id, limit),
            ).fetchall()
        records = [json.loads(row["payload_json"]) for row in rows]
        if not include_inactive:
            records = [record for record in records if record.get("active", True)]
        return records

    def delete(self, record_type: str, record_id: str, owner_id: str) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM records WHERE record_type=? AND record_id=? AND owner_id=?",
                (record_type, record_id, owner_id),
            )
            return cursor.rowcount == 1

    def idempotent_result(
        self, owner_id: str, action: str, idempotency_key: str
    ) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT result_json FROM idempotency WHERE owner_id=? AND action=? AND idempotency_key=?",
                (owner_id, action, idempotency_key),
            ).fetchone()
        return json.loads(row["result_json"]) if row else None

    def save_idempotent_result(
        self,
        owner_id: str,
        action: str,
        idempotency_key: str,
        result: BaseModel | dict[str, Any],
        now: str,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO idempotency(owner_id, action, idempotency_key, result_json, created_at)
                VALUES(?, ?, ?, ?, ?)
                """,
                (owner_id, action, idempotency_key, self._dump(result), now),
            )

    def update_idempotent_result(
        self,
        owner_id: str,
        action: str,
        idempotency_key: str,
        result: BaseModel | dict[str, Any],
        now: str,
    ) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO idempotency(owner_id, action, idempotency_key, result_json, created_at)
                VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(owner_id, action, idempotency_key) DO UPDATE SET result_json=excluded.result_json
                """,
                (owner_id, action, idempotency_key, self._dump(result), now),
            )

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
