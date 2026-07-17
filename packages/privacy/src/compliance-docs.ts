import type { PrivacyConfig } from './config';

export interface ComplianceDocConfig {
  /** Organization name */
  organizationName: string;
  /** Contact email for privacy inquiries */
  contactEmail: string;
  /** Privacy config */
  privacy: PrivacyConfig;
  /** Data sources used (databases, caches, APIs) */
  dataSources: string[];
  /** Third-party services integrated */
  thirdPartyServices?: Array<{ name: string; purpose: string; dataShared: string[] }>;
  /** Jurisdictions where data is stored */
  dataLocations?: string[];
}

export interface ComplianceDocument {
  /** Document type */
  type: 'privacy-policy' | 'data-flow' | 'processing-record' | 'dpia';
  /** Generated markdown content */
  content: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Document version */
  version: string;
}

/**
 * Compliance documentation generator — auto-generate data flow diagrams,
 * processing records, and DPIA templates from config.
 */
export class ComplianceDocGenerator {
  private config: ComplianceDocConfig;

  constructor(config: ComplianceDocConfig) {
    this.config = config;
  }

  /**
   * Generate a privacy policy document.
   */
  generatePrivacyPolicy(): ComplianceDocument {
    const enabledFeatures: string[] = [];
    if (this.config.privacy.analytics) enabledFeatures.push('Analytics');
    if (this.config.privacy.telemetry) enabledFeatures.push('Telemetry');
    if (this.config.privacy.errorReporting) enabledFeatures.push('Error Reporting');
    if (this.config.privacy.performanceMonitoring) enabledFeatures.push('Performance Monitoring');

    const thirdPartySection = this.config.thirdPartyServices?.length
      ? `## Third-Party Services\n\n${this.config.thirdPartyServices
          .map((s) => `### ${s.name}\n\n**Purpose:** ${s.purpose}\n**Data shared:** ${s.dataShared.join(', ')}\n`)
          .join('\n')}`
      : '## Third-Party Services\n\nNo third-party services are integrated.';

    const dataFlowSection = this.generateDataFlowSection();

    return {
      type: 'privacy-policy',
      generatedAt: new Date().toISOString(),
      version: '1.0',
      content: `# Privacy Policy — ${this.config.organizationName}

Last updated: ${new Date().toISOString().split('T')[0]}

## Overview

${this.config.organizationName} is committed to protecting your privacy. This policy describes what data we collect, how we use it, and your rights under GDPR and CCPA.

## Data We Collect

### Data Sources

${this.config.dataSources.map((s) => `- ${s}`).join('\n')}

### Data Location

Data is stored in: ${this.config.dataLocations?.join(', ') ?? 'Not specified'}

## How We Use Your Data

${enabledFeatures.length > 0 ? `The following features are enabled:\n${enabledFeatures.map((f) => `- ${f}`).join('\n')}` : 'No tracking, analytics, or telemetry features are enabled. We collect only the minimum data necessary to provide the service.'}

## Privacy by Default

- Analytics: ${this.config.privacy.analytics ? 'Enabled (opt-in)' : 'Disabled'}
- Telemetry: ${this.config.privacy.telemetry ? 'Enabled (opt-in)' : 'Disabled'}
- Error Reporting: ${this.config.privacy.errorReporting ? 'Enabled (opt-in)' : 'Disabled'}
- Third-Party Scripts: ${this.config.privacy.thirdPartyScripts ? 'Enabled (opt-in)' : 'Disabled'}
- Consent Required: ${this.config.privacy.requireConsent ? 'Yes' : 'No'}

## Data Retention

Data is retained for ${this.config.privacy.dataRetentionDays ?? 90} days, after which it is automatically purged.

## Your Rights

### GDPR (EU Users)
- Right to access your data (Article 15)
- Right to rectification (Article 16)
- Right to erasure / right to be forgotten (Article 17)
- Right to data portability (Article 20)
- Right to object to processing (Article 21)

### CCPA (California Users)
- Right to know what personal information is collected
- Right to delete personal information
- Right to opt out of the sale of personal information
- Right to non-discrimination

## Contact

For privacy inquiries, contact: ${this.config.contactEmail}

${thirdPartySection}

${dataFlowSection}
`,
    };
  }

  /**
   * Generate a data flow diagram (Mermaid format).
   */
  generateDataFlow(): ComplianceDocument {
    const sources = this.config.dataSources.map((s) => `"${s}"`).join(' & ');
    const thirdParties = this.config.thirdPartyServices?.map((s) => `"${s.name}"`).join(' & ') ?? '';

    const diagram = `\`\`\`mermaid
graph TD
    User[User] --> |Request| App[${this.config.organizationName} App]
    App --> |Read/Write| Storage[${sources}]
    ${thirdParties ? `App --> |Share| ThirdParty[${thirdParties}]\n` : ''}    Storage --> |Purge after ${this.config.privacy.dataRetentionDays ?? 90}d| Purge[Automatic Deletion]
\`\`\``;

    return {
      type: 'data-flow',
      generatedAt: new Date().toISOString(),
      version: '1.0',
      content: `# Data Flow Diagram — ${this.config.organizationName}

Generated: ${new Date().toISOString()}

${diagram}
`,
    };
  }

  /**
   * Generate a processing record (GDPR Article 30).
   */
  generateProcessingRecord(): ComplianceDocument {
    const purposes: Array<{ purpose: string; lawfulBasis: string; recipients: string; retention: string }> = [
      {
        purpose: 'Service provision',
        lawfulBasis: 'Contract performance (Art. 6(1)(b))',
        recipients: this.config.organizationName,
        retention: `${this.config.privacy.dataRetentionDays ?? 90} days`,
      },
    ];

    if (this.config.privacy.analytics) {
      purposes.push({
        purpose: 'Analytics',
        lawfulBasis: 'Consent (Art. 6(1)(a))',
        recipients: this.config.thirdPartyServices?.find((s) => s.name.toLowerCase().includes('analytic'))?.name ?? 'Internal',
        retention: `${this.config.privacy.dataRetentionDays ?? 90} days`,
      });
    }

    const table = purposes.map((p) => `| ${p.purpose} | ${p.lawfulBasis} | ${p.recipients} | ${p.retention} |`).join('\n');

    return {
      type: 'processing-record',
      generatedAt: new Date().toISOString(),
      version: '1.0',
      content: `# Record of Processing Activities — ${this.config.organizationName}

Generated: ${new Date().toISOString()}

## Article 30 — Record of Processing Activities

| Purpose | Lawful Basis | Recipients | Retention Period |
|---------|-------------|------------|------------------|
${table}

## Data Sources

${this.config.dataSources.map((s) => `- ${s}`).join('\n')}

## Third-Party Processors

${this.config.thirdPartyServices?.map((s) => `- **${s.name}**: ${s.purpose} (Data: ${s.dataShared.join(', ')})`).join('\n') ?? 'None'}

## Data Location

${this.config.dataLocations?.join(', ') ?? 'Not specified'}

## Contact

Data Protection Officer: ${this.config.contactEmail}
`,
    };
  }

  /**
   * Generate a DPIA (Data Protection Impact Assessment) template.
   */
  generateDPIA(): ComplianceDocument {
    return {
      type: 'dpia',
      generatedAt: new Date().toISOString(),
      version: '1.0',
      content: `# Data Protection Impact Assessment (DPIA) — ${this.config.organizationName}

Generated: ${new Date().toISOString()}

## 1. Description of Processing

**Organization:** ${this.config.organizationName}
**Data Sources:** ${this.config.dataSources.join(', ')}
**Data Location:** ${this.config.dataLocations?.join(', ') ?? 'Not specified'}

## 2. Necessity and Proportionality

- Data collected is limited to what is necessary for service provision.
- Retention period: ${this.config.privacy.dataRetentionDays ?? 90} days
- Privacy by default: ${this.config.privacy.analytics ? 'No — analytics enabled' : 'Yes — all tracking disabled by default'}

## 3. Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Unauthorized data access | Low | High | Encryption at rest (AES-256-GCM), HTTPS enforcement |
| Data breach | Low | High | PII redaction in logs, audit logging, access controls |
| Excessive data retention | Medium | Medium | Automatic purge after ${this.config.privacy.dataRetentionDays ?? 90} days |
| Non-consensual tracking | Low | High | Consent required: ${this.config.privacy.requireConsent ? 'Yes' : 'No'} |

## 4. Measures to Address Risks

- AES-256-GCM encryption for sensitive data at rest
- HSTS and HTTPS enforcement for data in transit
- PII redaction in all logs and error reports
- Automatic data retention purge
- Granular cookie consent with versioned policies
- Privacy-by-default configuration

## 5. Sign-off

**DPO:** ${this.config.contactEmail}
**Date:** ${new Date().toISOString().split('T')[0]}
`,
    };
  }

  /**
   * Generate all compliance documents at once.
   */
  generateAll(): ComplianceDocument[] {
    return [
      this.generatePrivacyPolicy(),
      this.generateDataFlow(),
      this.generateProcessingRecord(),
      this.generateDPIA(),
    ];
  }

  private generateDataFlowSection(): string {
    return `## Data Flow\n\nData flows from users through the application to the following storage:\n${this.config.dataSources.map((s) => `- ${s}`).join('\n')}\n\nData is automatically purged after ${this.config.privacy.dataRetentionDays ?? 90} days.`;
  }
}
