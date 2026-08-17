-- Provisions a dedicated role and database for the conductor service.
-- Each v2 service gets its own database (not just its own schema) on the
-- shared local PostgreSQL server, so a service credential can never read
-- or write another service's tables even inside the same cluster.
--
-- conductor's database is named "workflow", not "conductor" — the domain
-- it owns — per docs/database-migrations.md; every other v2 service's
-- role and database share the service's own name.
--
-- postgres docker images only run files under docker-entrypoint-initdb.d
-- on first container start against an empty data volume. Re-running this
-- against an existing volume requires `make infra:purge` first, or
-- applying it manually with psql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'conductor') THEN
    CREATE ROLE conductor WITH LOGIN PASSWORD 'conductor';
  END IF;
END
$$;

-- CREATE DATABASE cannot run inside a transaction block (including a DO
-- block), so \gexec runs it conditionally at the top level instead.
SELECT 'CREATE DATABASE workflow OWNER conductor'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workflow')\gexec

REVOKE ALL ON DATABASE workflow FROM PUBLIC;
