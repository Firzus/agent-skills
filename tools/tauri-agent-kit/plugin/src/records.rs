use serde_json::{json, Value};
use std::{
    collections::VecDeque,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tracing::{Event, Subscriber};
use tracing_subscriber::{layer::Context, Layer};

#[derive(Default)]
pub struct Diagnostics {
    records: Mutex<(u64, VecDeque<Value>)>,
    pub(crate) operations: tokio::sync::Mutex<()>,
}

impl Diagnostics {
    pub fn push(&self, kind: &str, data: Value) {
        let data = if serde_json::to_vec(&data)
            .map(|v| v.len())
            .unwrap_or(usize::MAX)
            > 8192
        {
            json!({"omitted":"entry_exceeds_8192_bytes"})
        } else {
            data
        };
        let Ok(mut records) = self.records.lock() else {
            return;
        };
        records.0 += 1;
        let id = records.0;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        records
            .1
            .push_back(json!({ "id": id, "timestamp": timestamp, "kind": kind, "data": data }));
        if records.1.len() > 1000 {
            records.1.pop_front();
        }
    }

    pub fn read(&self, kind: &str, after: u64, limit: usize) -> Value {
        let Ok(records) = self.records.lock() else {
            return json!({"error":"records_unavailable"});
        };
        let rows: Vec<_> = records
            .1
            .iter()
            .filter(|r| r["kind"] == kind && r["id"].as_u64().unwrap_or(0) > after)
            .take(limit.min(200))
            .cloned()
            .collect();
        let next = rows.last().and_then(|r| r["id"].as_u64()).unwrap_or(after);
        let has_more = records
            .1
            .iter()
            .any(|r| r["kind"] == kind && r["id"].as_u64().unwrap_or(0) > next);
        let oldest = records
            .1
            .front()
            .and_then(|r| r["id"].as_u64())
            .unwrap_or(0);
        json!({ "records": rows, "nextCursor":next,"hasMore":has_more,"evicted":after.saturating_add(1)<oldest,"latestCursor": records.0, "oldestCursor": oldest, "coverage": if kind == "ipc" { "explicitly-instrumented-calls-only" } else { "attached-sources-only" } })
    }
}

impl<S: Subscriber> Layer<S> for Diagnostics {
    fn on_event(&self, event: &Event<'_>, _: Context<'_, S>) {
        self.push("log", json!({ "level": event.metadata().level().as_str(), "target": event.metadata().target(), "name": event.metadata().name(), "provenance": "rust-tracing", "payload": "omitted" }));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn continuation_does_not_skip_records() {
        let records = Diagnostics::default();
        for i in 0..250 {
            records.push("log", json!(i));
        }
        let first = records.read("log", 0, 200);
        let second = records.read("log", first["nextCursor"].as_u64().unwrap(), 200);
        assert_eq!(first["records"].as_array().unwrap().len(), 200);
        assert_eq!(second["records"].as_array().unwrap().len(), 50);
        assert_eq!(second["records"][0]["id"], 201);
        assert_eq!(second["hasMore"], false);
    }
    #[test]
    fn oversized_entries_are_omitted() {
        let records = Diagnostics::default();
        records.push("log", json!("🦀".repeat(8192)));
        assert_eq!(
            records.read("log", 0, 1)["records"][0]["data"]["omitted"],
            "entry_exceeds_8192_bytes"
        );
    }
    #[test]
    fn bounds_records_and_preserves_unicode() {
        let records = Diagnostics::default();
        for _ in 0..1005 {
            records.push("log", json!("é🦀"));
        }
        let result = records.read("log", 0, 2000);
        assert_eq!(result["records"].as_array().unwrap().len(), 200);
        assert_eq!(result["oldestCursor"], 6);
        assert_eq!(result["records"][0]["data"], "é🦀");
    }
}
