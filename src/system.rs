use std::collections::HashMap;
use sysinfo::System;
use wmi::{COMLibrary, Variant, WMIConnection};

#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemMetrics {
    pub cpu_name: String,
    pub cpu_temp: f32,
    pub cpu_temp_available: bool,
    pub cpu_load: u32,
    pub cpu_clock_mhz: u32,
    pub ram_total_gb: f64,
    pub ram_used_gb: f64,
    pub motherboard: String,
}

pub fn get_system_metrics() -> SystemMetrics {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = get_cpu_name();
    let (cpu_temp, cpu_temp_available) = get_cpu_temp(&sys);
    let cpu_load = get_cpu_load(&sys);
    let cpu_clock_mhz = get_cpu_clock(&sys);
    let (ram_total_gb, ram_used_gb) = get_ram_info(&sys);
    let motherboard = get_motherboard();

    SystemMetrics {
        cpu_name,
        cpu_temp,
        cpu_temp_available,
        cpu_load,
        cpu_clock_mhz,
        ram_total_gb,
        ram_used_gb,
        motherboard,
    }
}

fn get_cpu_name() -> String {
    if let Ok(com) = COMLibrary::new() {
        let wmi = WMIConnection::new(com).unwrap();
        let results: Vec<HashMap<String, Variant>> =
            wmi.raw_query("SELECT Name FROM Win32_Processor").unwrap();
        if let Some(row) = results.first()
            && let Some(Variant::String(name)) = row.get("Name")
        {
            return name.clone();
        }
    }

    "Unknown CPU".to_string()
}

fn get_cpu_temp(sys: &System) -> (f32, bool) {
    if sys.cpus().is_empty() {
        return (0.0, false);
    }
    (0.0, false)
}

fn get_cpu_load(sys: &System) -> u32 {
    if sys.cpus().is_empty() {
        return 0;
    }

    (sys.cpus().iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / sys.cpus().len() as f32) as _
}

fn get_cpu_clock(sys: &System) -> u32 {
    if sys.cpus().is_empty() {
        return 0;
    }

    let max_freq = sys.cpus().iter().map(|c| c.frequency()).max().unwrap_or(0);
    max_freq as _
}

fn get_ram_info(sys: &System) -> (f64, f64) {
    let total_gb = sys.total_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    let used_gb = sys.used_memory() as f64 / 1024.0 / 1024.0 / 1024.0;
    (total_gb, used_gb)
}

#[cfg(target_os = "windows")]
fn get_motherboard() -> String {
    if let Ok(com) = COMLibrary::new() {
        let wmi = match WMIConnection::new(com) {
            Ok(conn) => conn,
            Err(_) => return "Unknown Motherboard".to_string(),
        };
        
        match wmi.raw_query("SELECT Product FROM Win32_BaseBoard") {
            Ok(results) => {
                for row in &results {
                    let _row: &HashMap<String, Variant> = row;
                    let product: &Variant = row.get("Product").unwrap();
                    if let Variant::String(product_str) = product {
                        return product_str.clone();
                    }
                }
            }
            Err(_) => {
                eprintln!("[system] WMI query failed for Win32_BaseBoard");
            }
        }
    }

    "Unknown Motherboard".to_string()
}

#[cfg(not(target_os = "windows"))]
fn get_motherboard() -> String {
    "N/A".to_string()
}
