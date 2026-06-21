-- Add client-generated idempotency keys to prevent duplicate mobile submits (Rule 12).
ALTER TABLE "LogEntry" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "LogEntry_idempotencyKey_key" ON "LogEntry"("idempotencyKey");

ALTER TABLE "Shift" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Shift_idempotencyKey_key" ON "Shift"("idempotencyKey");
