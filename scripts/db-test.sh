#!/usr/bin/env bash
# Apply the Phase 2 migrations to a disposable PostgreSQL cluster and run the
# tenant-isolation tests. Nothing touches a real Supabase project.
#
# Requirements: PostgreSQL 16 binaries (initdb, pg_ctl, psql).
#   PG_BIN=/path/to/postgresql/bin bash scripts/db-test.sh
# Without PG_BIN the script uses .tmp/pg/root/usr/lib/postgresql/16/bin when
# present, then falls back to the binaries on PATH.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -n "${PG_BIN:-}" ]]; then
  :
elif [[ -x "$ROOT/.tmp/pg/root/usr/lib/postgresql/16/bin/initdb" ]]; then
  PG_BIN="$ROOT/.tmp/pg/root/usr/lib/postgresql/16/bin"
elif command -v initdb >/dev/null 2>&1; then
  PG_BIN="$(dirname "$(command -v initdb)")"
else
  echo "error: PostgreSQL binaries not found. Set PG_BIN to a directory containing initdb." >&2
  exit 1
fi

if [[ -d "$ROOT/.tmp/pg/root/usr/lib/x86_64-linux-gnu" ]]; then
  export LD_LIBRARY_PATH="$ROOT/.tmp/pg/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

WORK="$ROOT/.tmp/db-test"
DATA="$WORK/data"
SOCKET="$WORK/socket"
PORT="${PG_TEST_PORT:-55432}"
DB="acadence_test"

rm -rf "$WORK"
mkdir -p "$SOCKET"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust --no-instructions >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -l "$WORK/postgres.log" \
  -o "-k $SOCKET -p $PORT -c listen_addresses='' -c jit=off" start >/dev/null

PSQL=("$PG_BIN/psql" -h "$SOCKET" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null
"${PSQL[@]}" -d "$DB" -f supabase/tests/harness.sql

for migration in $(ls supabase/migrations/*.sql | sort); do
  echo "applying $migration"
  "${PSQL[@]}" -d "$DB" -f "$migration"
done

echo "running tenant isolation tests"
"${PSQL[@]}" -d "$DB" -f supabase/tests/tenancy_isolation.sql

echo "running institution management tests"
"${PSQL[@]}" -d "$DB" -f supabase/tests/institution_management.sql
