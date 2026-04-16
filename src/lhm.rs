#[cfg(target_os = "windows")]
use serde::Deserialize;

/// Sensor reading from sensor_bridge.exe output
#[cfg(target_os = "windows")]
#[derive(Deserialize, Debug)]
struct SensorReading {
    hardware: String,
    #[allow(dead_code)]
    subhardware: Option<String>,
    name: String,
    #[serde(rename = "type")]
    sensor_type: String,
    value: Option<f64>,
}

#[cfg(target_os = "windows")]
#[allow(dead_code)]
pub async fn ensure_lhm_available() -> Result<(), String> {
    if is_sensor_bridge_available() {
        return Ok(());
    }
    Err("Sensor bridge not available".to_string())
}

#[cfg(target_os = "windows")]
pub fn is_sensor_bridge_available() -> bool {
    let exe_dir = match std::env::current_exe().ok().and_then(|p| p.parent().map(|x| x.to_path_buf())) {
        Some(d) => d,
        None => return false,
    };
    let bridge_path = exe_dir.join("bin").join("sensor_bridge.exe");
    bridge_path.exists()
}

#[cfg(target_os = "windows")]
pub fn is_lhm_installed() -> bool {
    is_sensor_bridge_available()
}

#[cfg(target_os = "windows")]
pub fn is_lhm_available() -> bool {
    is_sensor_bridge_available()
}

#[cfg(target_os = "windows")]
pub async fn start_lhm() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn get_lhm_cpu_temp() -> (f32, bool) {
    let exe_dir = match std::env::current_exe().ok().and_then(|p| p.parent().map(|x| x.to_path_buf())) {
        Some(d) => d,
        None => {
            eprintln!("[LHM] Failed to get executable directory");
            return (0.0, false);
        }
    };

    let bridge_path = exe_dir.join("bin").join("sensor_bridge.exe");

    if !bridge_path.exists() {
        eprintln!("sensor_bridge.exe not found at {:?}", bridge_path);
        return (0.0, false);
    }

    let output = match std::process::Command::new(&bridge_path).output().ok() {
        Some(o) => o,
        None => {
            eprintln!("[LHM] Failed to execute sensor_bridge.exe");
            return (0.0, false);
        }
    };

    if !output.status.success() {
        eprintln!("sensor_bridge.exe failed: {:?}", output.status);
        return (0.0, false);
    }

    let json_str = match String::from_utf8(output.stdout).ok() {
        Some(s) => s,
        None => {
            eprintln!("[LHM] Failed to parse stdout as UTF-8");
            return (0.0, false);
        }
    };

    let readings: Vec<SensorReading> = match serde_json::from_str(&json_str).ok() {
        Some(r) => r,
        None => {
            eprintln!("[LHM] Failed to parse sensor JSON");
            return (0.0, false);
        }
    };

    readings
        .iter()
        .find(|r| r.sensor_type == "Temperature" && r.name.contains("Package"))
        .and_then(|r| r.value)
        .map(|v| (v as f32, true))
        .unwrap_or((0.0, false))
}

#[cfg(target_os = "windows")]
pub fn is_lhm_running() -> bool {
    true
}

#[cfg(target_os = "windows")]
pub fn minimize_lhm() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn configure_lhm_auto_minimize() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub async fn download_and_install_lhm() -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn uninstall_lhm() -> Result<(), String> {
    Ok(())
}
