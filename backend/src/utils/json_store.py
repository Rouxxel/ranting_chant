"""
json_store.py

Thread-safe JSON read/write utility for mock database collections.

Each collection maps to a JSON file under:
  src/resources/mock_db_jsons/{collection}.json

All file I/O is protected by a per-collection threading.Lock to prevent
race conditions when multiple threads access the same collection.
"""

import json
import threading
from pathlib import Path

# Base directory where all collection JSON files live
_BASE_PATH: Path = Path(__file__).parent.parent / "resources" / "mock_db_jsons"

# Per-collection locks — created on first access
_locks: dict[str, threading.Lock] = {}
_locks_meta_lock = threading.Lock()  # guards _locks dict itself


def _get_lock(collection: str) -> threading.Lock:
    """Return (and lazily create) the Lock for the given collection."""
    with _locks_meta_lock:
        if collection not in _locks:
            _locks[collection] = threading.Lock()
        return _locks[collection]


def _collection_path(collection: str) -> Path:
    """Return the Path to the JSON file for *collection*."""
    return _BASE_PATH / f"{collection}.json"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def read_all(collection: str) -> list:
    """Read and return every record in *collection*.

    Args:
        collection: Name of the collection (e.g. ``"tenants"``).

    Returns:
        A list of record dicts.  Returns an empty list if the file does
        not exist yet.
    """
    lock = _get_lock(collection)
    path = _collection_path(collection)

    with lock:
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)


def find_by_id(collection: str, record_id: str) -> dict | None:
    """Return the first record whose ``"id"`` field equals *record_id*.

    Args:
        collection: Name of the collection.
        record_id:  The id value to search for.

    Returns:
        The matching record dict, or ``None`` if not found.
    """
    records = read_all(collection)
    for record in records:
        if record.get("id") == record_id:
            return record
    return None


def find_by_field(collection: str, field: str, value) -> list:
    """Return all records where ``record[field] == value``.

    Args:
        collection: Name of the collection.
        field:      The field name to filter on.
        value:      The value to match.

    Returns:
        A (possibly empty) list of matching record dicts.
    """
    records = read_all(collection)
    return [r for r in records if r.get(field) == value]


def create_record(collection: str, record: dict) -> dict:
    """Append *record* to *collection* and persist the change.

    Args:
        collection: Name of the collection.
        record:     The record dict to append.

    Returns:
        The same *record* dict that was appended.
    """
    lock = _get_lock(collection)
    path = _collection_path(collection)

    with lock:
        if path.exists():
            with path.open("r", encoding="utf-8") as fh:
                data = json.load(fh)
        else:
            data = []

        data.append(record)

        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)

    return record


def update_record(collection: str, record_id: str, updates: dict) -> dict:
    """Find a record by id, merge *updates* into it, and persist.

    Args:
        collection: Name of the collection.
        record_id:  The id of the record to update.
        updates:    A dict of fields to merge into the existing record.

    Returns:
        The updated record dict.

    Raises:
        ValueError: If no record with *record_id* exists in *collection*.
    """
    lock = _get_lock(collection)
    path = _collection_path(collection)

    with lock:
        if not path.exists():
            raise ValueError(
                f"Record with id '{record_id}' not found in collection '{collection}'."
            )

        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        updated_record = None
        for record in data:
            if record.get("id") == record_id:
                record.update(updates)
                updated_record = record
                break

        if updated_record is None:
            raise ValueError(
                f"Record with id '{record_id}' not found in collection '{collection}'."
            )

        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)

    return updated_record


def delete_record(collection: str, record_id: str) -> dict:
    """Remove a record by id from *collection* and persist the change.

    Args:
        collection: Name of the collection.
        record_id:  The id of the record to delete.

    Returns:
        The deleted record dict.

    Raises:
        ValueError: If no record with *record_id* exists in *collection*.
    """
    lock = _get_lock(collection)
    path = _collection_path(collection)

    with lock:
        if not path.exists():
            raise ValueError(
                f"Record with id '{record_id}' not found in collection '{collection}'."
            )

        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        deleted_record = None
        remaining_records = []
        for record in data:
            if record.get("id") == record_id:
                deleted_record = record
            else:
                remaining_records.append(record)

        if deleted_record is None:
            raise ValueError(
                f"Record with id '{record_id}' not found in collection '{collection}'."
            )

        with path.open("w", encoding="utf-8") as fh:
            json.dump(remaining_records, fh, indent=2, ensure_ascii=False)

    return deleted_record


def save_all(collection: str, data: list) -> None:
    """Overwrite *collection* with *data* (full replacement).

    Args:
        collection: Name of the collection.
        data:       The complete list of records to write.
    """
    lock = _get_lock(collection)
    path = _collection_path(collection)

    with lock:
        with path.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
