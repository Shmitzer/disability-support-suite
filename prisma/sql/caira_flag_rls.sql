-- CairaFlag tenant isolation. Matches rls_policies_v2.sql; idempotent.
ALTER TABLE "CairaFlag" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CairaFlag";
CREATE POLICY tenant_isolation ON "CairaFlag"
  FOR ALL TO authenticated
  USING ( "organisationId" = (auth.jwt() ->> 'organisationId') )
  WITH CHECK ( "organisationId" = (auth.jwt() ->> 'organisationId') );
