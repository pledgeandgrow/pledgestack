/**
 * client-only — Throw when imported by server-side code.
 *
 * This module is a marker: importing it from a server bundle throws an error.
 * The bundler (PledgePack) detects the import and excludes the module from
 * server bundles, replacing it with a throw stub.
 *
 * Usage in a client-only module:
 *   import 'pledgestack/client-only';
 *
 * The bundler treats this as a boundary — any module importing this is
 * considered client-only and will not be included in server bundles.
 */

throw new Error(
  "This module cannot be imported from a Server Component module. " +
  "It should only be used from a Client Component."
);
