using LibreHardwareMonitor.Hardware;
using System.Text.Json;
using System.IO;

class UpdateVisitor : IVisitor
{
    public void VisitComputer(IComputer computer)
    {
        computer.Traverse(this);
    }
    public void VisitHardware(IHardware hardware)
    {
        hardware.Update();
        foreach (var sub in hardware.SubHardware) sub.Accept(this);
    }
    public void VisitSensor(ISensor sensor) { }
    public void VisitParameter(IParameter parameter) { }
}

class Program
{
    static void Main()
    {
        var computer = new Computer
        {
            IsCpuEnabled = true,
            IsMotherboardEnabled = true,
            IsMemoryEnabled = true,
            IsGpuEnabled = false,
            IsStorageEnabled = false
        };

        computer.Open();
        computer.Accept(new UpdateVisitor());

        var sensors = new List<object>();

        foreach (var hardware in computer.Hardware)
        {
            foreach (var subHardware in hardware.SubHardware)
            {
                foreach (var sensor in subHardware.Sensors)
                {
                    sensors.Add(new
                    {
                        hardware = hardware.Name,
                        subhardware = subHardware.Name,
                        name = sensor.Name,
                        type = sensor.SensorType.ToString(),
                        value = sensor.Value
                    });
                }
            }

            foreach (var sensor in hardware.Sensors)
            {
                sensors.Add(new
                {
                    hardware = hardware.Name,
                    subhardware = (string?)null,
                    name = sensor.Name,
                    type = sensor.SensorType.ToString(),
                    value = sensor.Value
                });
            }
        }

        computer.Close();

        var json = JsonSerializer.Serialize(sensors);
        var tempFile = Path.Combine(Path.GetTempPath(), "sensor_bridge_output.json");
        File.WriteAllText(tempFile, json);
    }
}
