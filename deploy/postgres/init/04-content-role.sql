-- Provisions a dedicated role and database for the content service.
-- Each v2 service gets its own database (not just its own schema) on the
-- shared local PostgreSQL server, so a service credential can never read
-- or write another service's tables even inside the same cluster.
--
-- postgres docker images only run files under docker-entrypoint-initdb.d
-- on first container start against an empty data volume. Re-running this
-- against an existing volume requires `make infra:purge` first, or
-- applying it manually with psql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'content') THEN
    CREATE ROLE content WITH LOGIN PASSWORD 'content';
  END IF;
END
$$;

-- CREATE DATABASE cannot run inside a transaction block (including a DO
-- block), so \gexec runs it conditionally at the top level instead.
SELECT 'CREATE DATABASE content OWNER content'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'content')\gexec

REVOKE ALL ON DATABASE content FROM PUBLIC;
