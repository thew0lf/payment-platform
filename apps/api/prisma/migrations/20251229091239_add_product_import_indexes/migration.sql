-- CreateIndex
CREATE INDEX "field_mapping_profiles_companyId_provider_idx" ON "field_mapping_profiles"("companyId", "provider");

-- CreateIndex
CREATE INDEX "product_import_jobs_companyId_idx" ON "product_import_jobs"("companyId");

-- CreateIndex
CREATE INDEX "product_import_jobs_provider_idx" ON "product_import_jobs"("provider");
