// LHM disabled persistence (stored in config directory, not browser localStorage)
// When user cancels LHM install, we save this to ~/.config/llama-monitor/lhm-disabled

use std::path::Path;

pub fn save_lhm_disabled(path: &Path, disabled: bool) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = path.with_extension("tmp");
    let json = serde_json::to_string_pretty(&disabled).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, json).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_lhm_disabled(path: &Path) -> Result<bool, String> {
    if !path.exists() {
        return Ok(false);
    }
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}
