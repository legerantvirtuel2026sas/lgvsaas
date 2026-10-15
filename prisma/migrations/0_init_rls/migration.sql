-- Migration: Initialisation de Row Level Security (RLS) PostgreSQL pour LGV SaaS

-- Activer RLS sur les tables dépendantes d'une entreprise
ALTER TABLE IF EXISTS "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "document_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "emecef_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "licence_orders" ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : isoler les lignes par la variable de transaction PostgreSQL 'app.current_company_id'
DROP POLICY IF EXISTS tenant_isolation_memberships ON "memberships";
CREATE POLICY tenant_isolation_memberships ON "memberships"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_licenses ON "licenses";
CREATE POLICY tenant_isolation_licenses ON "licenses"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_settings ON "company_settings";
CREATE POLICY tenant_isolation_settings ON "company_settings"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_audit ON "audit_logs";
CREATE POLICY tenant_isolation_audit ON "audit_logs"
  FOR ALL
  USING ("companyId" IS NULL OR "companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_sequences ON "document_sequences";
CREATE POLICY tenant_isolation_sequences ON "document_sequences"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_emecef ON "emecef_credentials";
CREATE POLICY tenant_isolation_emecef ON "emecef_credentials"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));

DROP POLICY IF EXISTS tenant_isolation_orders ON "licence_orders";
CREATE POLICY tenant_isolation_orders ON "licence_orders"
  FOR ALL
  USING ("companyId" = NULLIF(current_setting('app.current_company_id', true), ''));
