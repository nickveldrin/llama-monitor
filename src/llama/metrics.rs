#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct LlamaMetrics {
    pub prompt_tokens_per_sec: f64,
    pub generation_tokens_per_sec: f64,
    pub throughput_source: String,
    pub prompt_throughput_active: bool,
    pub generation_throughput_active: bool,
    pub last_prompt_tokens_per_sec: f64,
    pub last_generation_tokens_per_sec: f64,
    pub last_prompt_throughput_unix_ms: u64,
    pub last_generation_throughput_unix_ms: u64,
    pub prompt_tokens_total: u64,
    pub generation_tokens_total: u64,
    #[serde(skip_serializing)]
    pub predicted_tokens_total: u64,
    #[serde(skip_serializing)]
    pub kv_cache_tokens: u64,
    #[serde(skip_serializing)]
    pub kv_cache_max: u64,
    #[serde(skip_serializing)]
    pub kv_cache_tokens_available: bool,
    #[serde(skip_serializing)]
    pub kv_cache_tokens_source: String,
    #[serde(skip_serializing)]
    pub kv_cache_high_water: u64,
    pub context_live_tokens: u64,
    pub context_live_tokens_available: bool,
    pub context_live_tokens_source: String,
    pub context_capacity_tokens: u64,
    pub context_high_water_tokens: u64,
    pub slots_idle: u32,
    pub slots_processing: u32,
    pub active_task_id: Option<u64>,
    pub last_task_id: Option<u64>,
    pub slot_generation_tokens: u64,
    pub slot_generation_remaining: u64,
    pub slot_generation_active: bool,
    pub slot_generation_available: bool,
    pub requests_processing: u32,
    pub status: String,
}

#[derive(Debug, Clone, Default)]
pub struct PrometheusValues {
    pub prompt_tokens_per_sec: f64,
    pub predicted_tokens_per_sec: f64,
    pub prompt_tokens_total: f64,
    pub prompt_seconds_total: f64,
    pub predicted_tokens_total: f64,
    pub predicted_seconds_total: f64,
    pub n_tokens_max: u64,
    pub requests_processing: u32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SlotValues {
    pub kv_cache_tokens: u64,
    pub kv_cache_max: u64,
    pub kv_cache_tokens_available: bool,
    pub kv_cache_tokens_source: String,
    pub slots_idle: u32,
    pub slots_processing: u32,
    pub active_task_id: Option<u64>,
    pub last_task_id: Option<u64>,
    pub slot_generation_tokens: u64,
    pub slot_generation_remaining: u64,
    pub slot_generation_active: bool,
    pub slot_generation_available: bool,
}

/// Parse Prometheus text format and extract the metrics we care about.
/// llama.cpp uses colon-separated names like `llamacpp:prompt_tokens_total`.
pub fn parse_prometheus_metrics(body: &str) -> PrometheusValues {
    let mut vals = PrometheusValues::default();
    for line in body.lines() {
        if line.starts_with('#') || line.is_empty() {
            continue;
        }
        let mut parts = line.split_whitespace();
        let name = match parts.next() {
            Some(n) => n,
            None => continue,
        };
        let name = name.split_once('{').map_or(name, |(name, _)| name);
        let value = match parts.next().and_then(|v| v.parse::<f64>().ok()) {
            Some(v) => v,
            None => continue,
        };
        match name {
            "llamacpp:prompt_tokens_seconds" => vals.prompt_tokens_per_sec = value,
            "llamacpp:predicted_tokens_seconds" => vals.predicted_tokens_per_sec = value,
            "llamacpp:prompt_tokens_total" => vals.prompt_tokens_total = value,
            "llamacpp:prompt_seconds_total" => vals.prompt_seconds_total = value,
            "llamacpp:tokens_predicted_total" => vals.predicted_tokens_total = value,
            "llamacpp:tokens_predicted_seconds_total" => vals.predicted_seconds_total = value,
            "llamacpp:n_tokens_max" => vals.n_tokens_max = value as u64,
            "llamacpp:requests_processing" => vals.requests_processing = value as u32,
            _ => {}
        }
    }
    vals
}

pub fn parse_slot_metrics(body: &str) -> Option<SlotValues> {
    let slots = serde_json::from_str::<Vec<serde_json::Value>>(body).ok()?;
    let mut vals = SlotValues::default();

    for slot in &slots {
        if slot
            .get("is_processing")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            vals.slots_processing += 1;
        } else {
            vals.slots_idle += 1;
        }

        if let Some(n_ctx) = slot.get("n_ctx").and_then(|v| v.as_u64()) {
            vals.kv_cache_max = vals.kv_cache_max.saturating_add(n_ctx);
        }

        if let Some((tokens, source)) = slot_context_tokens(slot) {
            vals.kv_cache_tokens = vals.kv_cache_tokens.saturating_add(tokens);
            vals.kv_cache_tokens_available = true;
            if vals.kv_cache_tokens_source.is_empty() {
                vals.kv_cache_tokens_source = source.to_string();
            }
        }

        let task_id = slot.get("id_task").and_then(|v| v.as_u64());
        if vals.last_task_id.is_none() {
            vals.last_task_id = task_id;
        }
        if slot
            .get("is_processing")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
            && vals.active_task_id.is_none()
        {
            vals.active_task_id = task_id;
        }

        if let Some((decoded, remaining, active)) = slot_generation_progress(slot) {
            vals.slot_generation_tokens = vals.slot_generation_tokens.saturating_add(decoded);
            vals.slot_generation_remaining =
                vals.slot_generation_remaining.saturating_add(remaining);
            vals.slot_generation_available = true;
            vals.slot_generation_active |= active;
        }
    }

    Some(vals)
}

fn slot_context_tokens(slot: &serde_json::Value) -> Option<(u64, &'static str)> {
    for key in ["n_tokens", "n_past", "n_ctx_used", "n_cache_tokens"] {
        if let Some(value) = slot.get(key).and_then(|v| v.as_u64()) {
            return Some((value, key));
        }
    }

    None
}

fn slot_generation_progress(slot: &serde_json::Value) -> Option<(u64, u64, bool)> {
    let token = slot.get("next_token").and_then(|v| v.as_array())?.first()?;
    let decoded = token.get("n_decoded").and_then(|v| v.as_u64())?;
    let remaining = token
        .get("n_remain")
        .and_then(|v| v.as_u64())
        .unwrap_or_default();
    let active = token
        .get("has_next_token")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Some((decoded, remaining, active))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_prometheus_metrics() {
        let body = include_str!("../../tests/fixtures/prometheus_metrics.txt");
        let vals = parse_prometheus_metrics(body);

        assert!((vals.prompt_tokens_per_sec - 1234.5).abs() < 0.1);
        assert!((vals.predicted_tokens_per_sec - 56.7).abs() < 0.1);
        assert!((vals.prompt_tokens_total - 10000.0).abs() < 0.1);
        assert!((vals.prompt_seconds_total - 8.1).abs() < 0.1);
        assert!((vals.predicted_tokens_total - 5000.0).abs() < 0.1);
        assert!((vals.predicted_seconds_total - 88.2).abs() < 0.1);
        assert_eq!(vals.n_tokens_max, 131072);
        assert_eq!(vals.requests_processing, 1);
    }

    #[test]
    fn test_parse_prometheus_metrics_empty() {
        let vals = parse_prometheus_metrics("");
        assert_eq!(vals.prompt_tokens_per_sec, 0.0);
        assert_eq!(vals.n_tokens_max, 0);
    }

    #[test]
    fn test_parse_prometheus_metrics_comments_only() {
        let body = "# HELP llamacpp:prompt_tokens_total Total prompt tokens\n# TYPE llamacpp:prompt_tokens_total counter\n";
        let vals = parse_prometheus_metrics(body);
        assert_eq!(vals.prompt_tokens_total, 0.0);
    }

    #[test]
    fn test_parse_prometheus_metrics_with_labels() {
        let body = r#"llamacpp:requests_processing{slot="0"} 1"#;
        let vals = parse_prometheus_metrics(body);
        assert_eq!(vals.requests_processing, 1);
    }

    #[test]
    fn test_parse_slot_metrics_capacity_and_status() {
        let body = r#"[{"id":0,"n_ctx":4096,"is_processing":false},{"id":1,"n_ctx":4096,"is_processing":true}]"#;
        let vals = parse_slot_metrics(body).unwrap();

        assert_eq!(vals.kv_cache_max, 8192);
        assert_eq!(vals.kv_cache_tokens, 0);
        assert!(!vals.kv_cache_tokens_available);
        assert_eq!(vals.slots_idle, 1);
        assert_eq!(vals.slots_processing, 1);
    }

    #[test]
    fn test_parse_slot_metrics_current_tokens_when_exposed() {
        let body = r#"[{"id":0,"n_ctx":4096,"is_processing":true,"n_tokens":1234}]"#;
        let vals = parse_slot_metrics(body).unwrap();

        assert_eq!(vals.kv_cache_max, 4096);
        assert_eq!(vals.kv_cache_tokens, 1234);
        assert!(vals.kv_cache_tokens_available);
        assert_eq!(vals.kv_cache_tokens_source, "n_tokens");
    }

    #[test]
    fn test_parse_slot_metrics_generation_progress() {
        let body = r#"[{"id":0,"n_ctx":4096,"is_processing":true,"id_task":2667,"next_token":[{"has_next_token":true,"n_remain":31849,"n_decoded":151}]}]"#;
        let vals = parse_slot_metrics(body).unwrap();

        assert_eq!(vals.active_task_id, Some(2667));
        assert_eq!(vals.last_task_id, Some(2667));
        assert_eq!(vals.slot_generation_tokens, 151);
        assert_eq!(vals.slot_generation_remaining, 31849);
        assert!(vals.slot_generation_active);
        assert!(vals.slot_generation_available);
    }
}
