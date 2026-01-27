// Generate Salesforce record URLs using Lightning Experience format

// Generic record URL for any standard/custom object
export function getSalesforceRecordUrl(instanceUrl: string | null, objectType: string, recordId: string): string | null {
  if (!instanceUrl || !recordId) return null;
  return `${instanceUrl}/lightning/r/${objectType}/${recordId}/view`;
}

export function getSalesforceUserUrl(instanceUrl: string | null, userId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'User', userId);
}

export function getSalesforcePermissionSetUrl(instanceUrl: string | null, permSetId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'PermissionSet', permSetId);
}

export function getSalesforceProfileUrl(instanceUrl: string | null, profileId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'Profile', profileId);
}

export function getSalesforceSetupAuditTrailUrl(instanceUrl: string | null, auditId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'SetupAuditTrail', auditId);
}

export function getSalesforceNamedCredentialUrl(instanceUrl: string | null, credId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'NamedCredential', credId);
}

export function getSalesforceInstalledPackageUrl(instanceUrl: string | null, packageId: string): string | null {
  // Installed packages use a setup page URL
  if (!instanceUrl || !packageId) return null;
  return `${instanceUrl}/lightning/setup/ImportedPackage/page?address=%2F${packageId}`;
}

export function getSalesforceConnectedAppUrl(instanceUrl: string | null, appId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'ConnectedApplication', appId);
}

export function getSalesforceLoginHistoryUrl(instanceUrl: string | null, loginId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'LoginHistory', loginId);
}

export function getSalesforceAuthSessionUrl(instanceUrl: string | null, sessionId: string): string | null {
  return getSalesforceRecordUrl(instanceUrl, 'AuthSession', sessionId);
}

export function getSalesforceCertificateUrl(instanceUrl: string | null, certId: string): string | null {
  // Certificates are viewed in the Certificate and Key Management setup page
  if (!instanceUrl || !certId) return null;
  return `${instanceUrl}/lightning/setup/CertificatesAndKeysManagement/page?address=%2F${certId}`;
}
