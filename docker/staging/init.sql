-- Run automatically on first postgres init via /docker-entrypoint-initdb.d/
-- Creates the app database and enables pgvector.

SELECT 'CREATE DATABASE app'
WHERE NOT EXISTS (
    SELECT FROM pg_database WHERE datname = 'app'
)\gexec

\c app
CREATE EXTENSION IF NOT EXISTS vector;
