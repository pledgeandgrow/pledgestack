/**
 * server-only — Throw when imported by client-side code.
 *
 * This module is a marker: importing it from a client bundle throws an error.
 * The bundler (PledgePack) detects the import and excludes the module from
 * client bundles, replacing it with a throw stub.
 *
 * Usage in a server-only module:
 *   import 'pledgestack/server-only';
 *
 * The bundler treats this as a boundary — any module importing this is
 * considered server-only and will not be included in client bundles.
 */

throw new Error(
  "This module cannot be imported from a Client Component module. " +
  "It should only be used from a Server Component or Route Handler."
);
