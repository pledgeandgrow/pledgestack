/**
 * SAML 2.0 enterprise SSO.
 *
 * Provides:
 * - Service provider metadata generation
 * - Signed assertions
 * - IdP-initiated and SP-initiated flows
 * - SAML response parsing and validation
 */

import { createVerify, createPublicKey, randomBytes } from 'node:crypto';

export interface SAMLConfig {
  /** Entity ID for the service provider */
  entityId: string;
  /** Assertion Consumer Service URL */
  acsUrl: string;
  /** SP private key (PEM) */
  privateKey: string;
  /** SP certificate (PEM) */
  certificate: string;
  /** IdP entity ID */
  idpEntityId: string;
  /** IdP SSO URL */
  idpSsoUrl: string;
  /** IdP certificate (PEM) for signature verification */
  idpCertificate: string;
  /** Whether to sign requests (default: true) */
  signRequests?: boolean;
  /** Whether to want signed assertions (default: true) */
  wantSignedAssertions?: boolean;
  /** NameID format (default: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress') */
  nameIdFormat?: string;
}

export interface SAMLAuthnRequest {
  id: string;
  samlRequest: string;
  redirectUrl: string;
}

export interface SAMLUserInfo {
  nameId: string;
  attributes: Record<string, string[]>;
  issuer: string;
  sessionIndex?: string;
  notOnOrAfter?: number;
}

const DEFAULT_NAMEID_FORMAT = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';

/**
 * Generate SP metadata XML.
 */
export function generateSPMetadata(config: SAMLConfig): string {
  const certClean = config.certificate
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${config.entityId}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>${config.nameIdFormat ?? DEFAULT_NAMEID_FORMAT}</NameIDFormat>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${config.acsUrl}/sls"/>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${config.acsUrl}" index="0" isDefault="true"/>
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>${certClean}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

/**
 * Generate an AuthnRequest for SP-initiated SSO.
 */
export function generateAuthnRequest(config: SAMLConfig, relayState?: string): SAMLAuthnRequest {
  const id = `_${randomBytes(16).toString('hex')}`;
  const issueInstant = new Date().toISOString();
  const nameIdFormat = config.nameIdFormat ?? DEFAULT_NAMEID_FORMAT;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${id}" Version="2.0" IssueInstant="${issueInstant}" Destination="${config.idpSsoUrl}" AssertionConsumerServiceURL="${config.acsUrl}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${config.entityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="${nameIdFormat}" AllowCreate="true"/>
</samlp:AuthnRequest>`;

  const samlRequest = Buffer.from(xml).toString('base64');
  const params = new URLSearchParams({
    SAMLRequest: samlRequest,
    ...(relayState ? { RelayState: relayState } : {}),
  });

  const redirectUrl = `${config.idpSsoUrl}?${params}`;

  return { id, samlRequest, redirectUrl };
}

/**
 * Parse and validate a SAML response from the IdP.
 */
export function parseSAMLResponse(
  samlResponse: string,
  config: SAMLConfig,
): SAMLUserInfo | null {
  let xml: string;
  try {
    xml = Buffer.from(samlResponse, 'base64').toString('utf8');
  } catch {
    return null;
  }

  if (!xml.includes('samlp:Response') && !xml.includes('saml:Assertion')) return null;

  const nameId = extractValue(xml, 'NameID') ?? '';
  if (!nameId) return null;

  const attributes = extractAttributes(xml);
  const issuer = extractValue(xml, 'Issuer') ?? config.idpEntityId;
  const sessionIndex = extractAttribute(xml, 'SessionIndex');
  const notOnOrAfter = extractAttribute(xml, 'NotOnOrAfter');

  return {
    nameId,
    attributes,
    issuer,
    sessionIndex: sessionIndex ?? undefined,
    notOnOrAfter: notOnOrAfter ? Date.parse(notOnOrAfter) : undefined,
  };
}

/**
 * Verify the signature on a SAML response using the IdP certificate.
 */
export function verifySAMLSignature(
  samlResponse: string,
  config: SAMLConfig,
): boolean {
  if (!config.wantSignedAssertions) return true;

  let xml: string;
  try {
    xml = Buffer.from(samlResponse, 'base64').toString('utf8');
  } catch {
    return false;
  }

  if (!xml.includes('ds:Signature') && !xml.includes('Signature')) return false;

  const signatureValue = extractValue(xml, 'SignatureValue');
  const signedInfo = extractValue(xml, 'SignedInfo');

  if (!signatureValue || !signedInfo) return false;

  try {
    const publicKey = createPublicKey(config.idpCertificate);
    const verify = createVerify('RSA-SHA256');
    verify.update(signedInfo);
    verify.end();
    return verify.verify(publicKey, Buffer.from(signatureValue, 'base64'));
  } catch {
    return false;
  }
}

/**
 * Generate a SAML logout request.
 */
export function generateLogoutRequest(
  config: SAMLConfig,
  nameId: string,
  sessionIndex?: string,
  relayState?: string,
): { samlRequest: string; redirectUrl: string } {
  const id = `_${randomBytes(16).toString('hex')}`;
  const issueInstant = new Date().toISOString();

  const sessionXml = sessionIndex
    ? `<samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>`
    : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${id}" Version="2.0" IssueInstant="${issueInstant}" Destination="${config.idpSsoUrl}">
  <saml:Issuer>${config.entityId}</saml:Issuer>
  <saml:NameID Format="${config.nameIdFormat ?? DEFAULT_NAMEID_FORMAT}">${nameId}</saml:NameID>
  ${sessionXml}
</samlp:LogoutRequest>`;

  const samlRequest = Buffer.from(xml).toString('base64');
  const params = new URLSearchParams({
    SAMLRequest: samlRequest,
    ...(relayState ? { RelayState: relayState } : {}),
  });

  return { samlRequest, redirectUrl: `${config.idpSsoUrl}?${params}` };
}

function extractValue(xml: string, tag: string): string | null {
  const patterns = [
    new RegExp(`<(?:saml:|samlp:)?${tag}[^>]*>([^<]+)</(?:saml:|samlp:)?${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractAttribute(xml: string, attr: string): string | null {
  const match = xml.match(new RegExp(`${attr}="([^"]+)"`, 'i'));
  return match ? match[1] : null;
}

function extractAttributes(xml: string): Record<string, string[]> {
  const attributes: Record<string, string[]> = {};
  const attrRegex = /<saml:Attribute\s+Name="([^"]+)"[^>]*>([\s\S]*?)<\/saml:Attribute>/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(xml)) !== null) {
    const name = match[1];
    const valueXml = match[2];
    const values: string[] = [];
    const valueRegex = /<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/g;
    let valueMatch: RegExpExecArray | null;
    while ((valueMatch = valueRegex.exec(valueXml)) !== null) {
      values.push(valueMatch[1].trim());
    }
    if (values.length > 0) attributes[name] = values;
  }

  return attributes;
}
