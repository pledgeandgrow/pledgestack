# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in PledgeStack, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email **mehdi.berel@pledgeandgrow.com** with details of the vulnerability
2. Include steps to reproduce, potential impact, and suggested fix (if any)
3. You will receive a response within 48 hours

### Scope

- PledgeStack framework packages (`pledgestack-*`)
- PledgePack bundler (`pledgepack` on npm)
- CLI tools and dev server
- VS Code extension

### Out of Scope

- Vulnerabilities in third-party dependencies (report to upstream maintainers)
- Issues in example apps that don't affect the framework
- Self-XSS or issues requiring physical access to a user's device

## Disclosure Policy

1. Vulnerability is received and confirmed
2. Fix is developed in a private branch
3. Patch release is published to npm
4. Public advisory is published after users have had time to update (typically 30 days)

## Security Best Practices for PledgeStack Users

- Always keep `pledgepack` and `pledgestack-*` packages updated
- Do not expose server-side environment variables to client bundles
- Use the `PLEDGE_` env prefix carefully — only `PLEDGE_PUBLIC_*` vars are exposed to client code
- Validate all API route inputs with proper type checking
- Enable CSP headers via middleware for production deployments
