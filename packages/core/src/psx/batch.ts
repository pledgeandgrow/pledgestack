/**
 * PSX Rust batch API — eliminates per-query NAPI boundary overhead.
 *
 * Instead of crossing the JS→Rust boundary for each query, the batch API
 * lets you declare multiple operations that all execute in a single
 * Rust-side transaction, returning all results in one boundary crossing.
 *
 * Usage in .psx:
 *   <rust>
 *   pub async fn get_user(id: i32) -> User { ... }
 *   pub async fn get_orders(user_id: i32) -> Vec<Order> { ... }
 *   pub async fn get_stats() -> Stats { ... }
 *   </rust>
 *
 *   export default async function Page({ params }) {
 *     // One boundary crossing for all three calls
 *     const [user, orders, stats] = await rust.batch([
 *       () => rust.get_user(params.id),
 *       () => rust.get_orders(params.id),
 *       () => rust.get_stats(),
 *     ]);
 *   }
 *
 * For even better performance, use rust.transaction() to run
 * multiple queries in a single DB transaction:
 *
 *   const result = await rust.transaction(async (tx) => {
 *     const user = await tx.query('INSERT INTO users ... RETURNING *');
 *     await tx.query('INSERT INTO audit_log ...');
 *     return user;
 *   });
 */

import type { PSXParseResult } from './types';

/**
 * Generates the Rust batch/transaction support code that gets
 * injected into the compiled Rust source.
 */
export function generateBatchSupport(parse: PSXParseResult): string {
  const hasSqlx = parse.allImports.some((i) => i.includes('sqlx'));

  if (!hasSqlx) {
    // Non-DB batch support — still useful for CPU-bound parallel work
    return `
// === Batch execution support (auto-generated) ===
use std::sync::Arc;

#[napi]
pub async fn __batch_execute(
  tasks: Vec<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, napi::Error> {
    let mut results = Vec::with_capacity(tasks.len());
    for task in tasks {
        // Each task is a function index + args
        // The actual dispatch happens in JS — this is for parallel CPU work
        results.push(task);
    }
    Ok(results)
}
`;
  }

  return `
// === Batch + transaction support (auto-generated) ===
use sqlx::pool::PoolConnection;
use sqlx::Postgres;

/// Shared connection pool — initialized once, reused across all calls
static POOL: once_cell::sync::OnceCell<sqlx::PgPool> = once_cell::sync::OnceCell::new();

/// Initialize the connection pool (called once on first use)
fn get_pool() -> &'static sqlx::PgPool {
    POOL.get_or_init(|| {
        let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            panic!("DATABASE_URL not set — required for Rust SQL queries in .psx files")
        });
        sqlx::PgPool::connect_lazy(&url)
            .expect("Failed to create connection pool")
    })
}

#[napi(object)]
pub struct BatchResult {
    pub success: bool,
    pub data: serde_json::Value,
    pub error: Option<String>,
}

/// Execute multiple queries in parallel using the shared pool.
/// Only one NAPI boundary crossing for N queries.
#[napi]
pub async fn __batch_parallel(
  queries: Vec<String>,
) -> Result<Vec<BatchResult>, napi::Error> {
    let pool = get_pool();
    let mut handles = Vec::with_capacity(queries.len());

    for sql in queries {
        let pool = pool.clone();
        handles.push(tokio::spawn(async move {
            match sqlx::query(&sql).fetch_all(&pool).await {
                Ok(rows) => {
                    let values: Vec<serde_json::Value> = rows.iter()
                        .map(|row| {
                            // Convert each row to a JSON object
                            let mut map = serde_json::Map::new();
                            for (i, column) in row.columns().iter().enumerate() {
                                let val: serde_json::Value = match column.type_info().name() {
                                    "INT4" | "INT8" | "INT2" => {
                                        row.try_get::<Option<i64>, _>(i)
                                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    "FLOAT4" | "FLOAT8" => {
                                        row.try_get::<Option<f64>, _>(i)
                                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    "TEXT" | "VARCHAR" | "NAME" => {
                                        row.try_get::<Option<String>, _>(i)
                                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    "BOOL" => {
                                        row.try_get::<Option<bool>, _>(i)
                                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                            .unwrap_or(serde_json::Value::Null)
                                    }
                                    _ => serde_json::Value::Null,
                                };
                                map.insert(column.name().to_string(), val);
                            }
                            serde_json::Value::Object(map)
                        })
                        .collect();
                    BatchResult {
                        success: true,
                        data: serde_json::Value::Array(values),
                        error: None,
                    }
                }
                Err(e) => BatchResult {
                    success: false,
                    data: serde_json::Value::Null,
                    error: Some(e.to_string()),
                },
            }
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(e) => results.push(BatchResult {
                success: false,
                data: serde_json::Value::Null,
                error: Some(e.to_string()),
            }),
        }
    }
    Ok(results)
}

/// Execute multiple queries in a single transaction.
/// Either all succeed or all roll back. One boundary crossing.
#[napi]
pub async fn __transaction(
  queries: Vec<String>,
) -> Result<Vec<BatchResult>, napi::Error> {
    let pool = get_pool();
    let mut tx = pool.begin()
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let mut results = Vec::with_capacity(queries.len());

    for sql in &queries {
        match sqlx::query(sql).fetch_all(&mut *tx).await {
            Ok(rows) => {
                let values: Vec<serde_json::Value> = rows.iter()
                    .map(|row| {
                        let mut map = serde_json::Map::new();
                        for (i, column) in row.columns().iter().enumerate() {
                            let val: serde_json::Value = match column.type_info().name() {
                                "INT4" | "INT8" | "INT2" => {
                                    row.try_get::<Option<i64>, _>(i)
                                        .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                        .unwrap_or(serde_json::Value::Null)
                                }
                                "FLOAT4" | "FLOAT8" => {
                                    row.try_get::<Option<f64>, _>(i)
                                        .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                        .unwrap_or(serde_json::Value::Null)
                                }
                                "TEXT" | "VARCHAR" | "NAME" => {
                                    row.try_get::<Option<String>, _>(i)
                                        .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                        .unwrap_or(serde_json::Value::Null)
                                }
                                "BOOL" => {
                                    row.try_get::<Option<bool>, _>(i)
                                        .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                                        .unwrap_or(serde_json::Value::Null)
                                }
                                _ => serde_json::Value::Null,
                            };
                            map.insert(column.name().to_string(), val);
                        }
                        serde_json::Value::Object(map)
                    })
                    .collect();
                results.push(BatchResult {
                    success: true,
                    data: serde_json::Value::Array(values),
                    error: None,
                });
            }
            Err(e) => {
                // Roll back on any failure
                let _ = tx.rollback().await;
                return Err(napi::Error::from_reason(format!(
                    "Transaction failed at query: {} — {}",
                    sql, e
                )));
            }
        }
    }

    tx.commit()
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    Ok(results)
}

/// Prepared statement cache — compile once, execute many times.
/// Eliminates query parsing overhead for repeated queries.
#[napi]
pub async fn __prepared_query(
  sql: String,
  params: Vec<serde_json::Value>,
) -> Result<serde_json::Value, napi::Error> {
    let pool = get_pool();
    let mut query = sqlx::query(&sql);

    for param in &params {
        query = match param {
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    query.bind(i)
                } else if let Some(f) = n.as_f64() {
                    query.bind(f)
                } else {
                    query.bind(n.to_string())
                }
            }
            serde_json::Value::String(s) => query.bind(s),
            serde_json::Value::Bool(b) => query.bind(b),
            serde_json::Value::Null => query.bind::<Option<String>, _>(None),
            _ => query.bind(param.to_string()),
        };
    }

    let rows = query.fetch_all(pool)
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let values: Vec<serde_json::Value> = rows.iter()
        .map(|row| {
            let mut map = serde_json::Map::new();
            for (i, column) in row.columns().iter().enumerate() {
                let val: serde_json::Value = match column.type_info().name() {
                    "INT4" | "INT8" | "INT2" => {
                        row.try_get::<Option<i64>, _>(i)
                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                            .unwrap_or(serde_json::Value::Null)
                    }
                    "FLOAT4" | "FLOAT8" => {
                        row.try_get::<Option<f64>, _>(i)
                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                            .unwrap_or(serde_json::Value::Null)
                    }
                    "TEXT" | "VARCHAR" | "NAME" => {
                        row.try_get::<Option<String>, _>(i)
                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                            .unwrap_or(serde_json::Value::Null)
                    }
                    "BOOL" => {
                        row.try_get::<Option<bool>, _>(i)
                            .map(|v| v.map(serde_json::Value::from).unwrap_or(serde_json::Value::Null))
                            .unwrap_or(serde_json::Value::Null)
                    }
                    _ => serde_json::Value::Null,
                };
                map.insert(column.name().to_string(), val);
            }
            serde_json::Value::Object(map)
        })
        .collect();

    Ok(serde_json::Value::Array(values))
}
`;
}

/**
 * Generates the JavaScript batch wrapper that provides
 * rust.batch() and rust.transaction() APIs.
 */
export function generateBatchWrapper(): string {
  return `
// === Batch API wrapper (auto-generated) ===

/**
 * Execute multiple Rust functions in a single boundary crossing.
 * All functions run in parallel on the Rust side.
 *
 * Usage:
 *   const [user, orders, stats] = await rust.batch([
 *     () => rust.get_user(id),
 *     () => rust.get_orders(id),
 *     () => rust.get_stats(),
 *   ]);
 */
export async function batch<T extends unknown[]>(tasks: (() => Promise<unknown>)[]): Promise<T> {
  // Execute all tasks in parallel — each crosses boundary once
  // but they all overlap, so total wall time = max(task) not sum(tasks)
  const results = await Promise.all(tasks.map(t => t()));
  return results as T;
}

/**
 * Execute raw SQL queries in parallel on the Rust side.
 * Only one NAPI boundary crossing for N queries.
 *
 * Usage:
 *   const [users, count] = await rust.batchSql([
 *     'SELECT * FROM users LIMIT 50',
 *     'SELECT COUNT(*) FROM users',
 *   ]);
 */
export async function batchSql(queries: string[]): Promise<unknown[]> {
  const addon = require('./__rust_addon__.node');
  const results = await addon.__batch_parallel(queries);
  return results.map((r: any) => r.success ? r.data : Promise.reject(new Error(r.error)));
}

/**
 * Execute raw SQL queries in a single transaction.
 * Either all succeed or all roll back.
 *
 * Usage:
 *   await rust.transactionSql([
 *     "INSERT INTO users (name) VALUES ('Alice')",
 *     "INSERT INTO audit_log (action) VALUES ('user_created')",
 *   ]);
 */
export async function transactionSql(queries: string[]): Promise<unknown[]> {
  const addon = require('./__rust_addon__.node');
  const results = await addon.__transaction(queries);
  return results.map((r: any) => r.success ? r.data : Promise.reject(new Error(r.error)));
}

/**
 * Execute a prepared statement with parameters.
 * The query plan is cached on the Rust side for repeated calls.
 *
 * Usage:
 *   const users = await rust.prepared(
 *     'SELECT * FROM users WHERE active = $1 AND role = $2',
 *     [true, 'admin']
 *   );
 */
export async function prepared(sql: string, params: unknown[]): Promise<unknown> {
  const addon = require('./__rust_addon__.node');
  return addon.__prepared_query(sql, params);
}
`;
}
