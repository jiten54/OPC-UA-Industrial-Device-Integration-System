import { OPCUAServer, Variant, DataType, StatusCodes, MessageSecurityMode, SecurityPolicy, UAObject, AddressSpace, Namespace } from "node-opcua";
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/config.json'), 'utf8'));

export async function startOpcuaServer() {
  console.log("[OPC-UA Server] Initializing...");
  
  const server = new OPCUAServer({
    port: config.opcua.port,
    resourcePath: "/UA/IndustrialServer",
    buildInfo: {
      productName: "IndustrialDeviceServer",
      buildNumber: "1.1.0",
      buildDate: new Date()
    }
  });

  await server.initialize();

  const addressSpace = server.engine.addressSpace!;
  const namespace = addressSpace.getOwnNamespace();

  // Create "Devices" folder under Objects
  const objectsFolder = addressSpace.rootFolder.objects;
  const devicesFolder = namespace.addFolder(objectsFolder, {
    browseName: "Devices"
  });

  console.log("[OPC-UA Server] Address space initialized. Creating nodes...");

  // Create Devices and their variables
  Object.keys(config.devices).forEach((deviceKey) => {
    const deviceConfig = config.devices[deviceKey];
    
    // Initialize current values in memory
    deviceConfig.currentValue = (deviceConfig.min + deviceConfig.max) / 2;
    deviceConfig.currentStatus = "NORMAL";

    const deviceNode = namespace.addObject({
      organizedBy: devicesFolder,
      browseName: deviceConfig.name,
      description: `Industrial ${deviceConfig.name} Device`
    });

    console.log(`[OPC-UA Server] Created device node: ${deviceConfig.name}`);

    // Add Variable for the sensor value
    const valueNode = namespace.addVariable({
      componentOf: deviceNode,
      browseName: "Value",
      dataType: "Double",
      value: {
        get: () => {
          return new Variant({ dataType: DataType.Double, value: deviceConfig.currentValue || 0 });
        }
      }
    });

    // Add Variable for Status
    const statusNode = namespace.addVariable({
      componentOf: deviceNode,
      browseName: "Status",
      dataType: "String",
      value: {
        get: () => {
          return new Variant({ dataType: DataType.String, value: deviceConfig.currentStatus || "NORMAL" });
        }
      }
    });

    // Store references to nodes for direct updates if needed
    deviceConfig.nodes = {
      value: valueNode,
      status: statusNode
    };
  });

  await server.start();
  console.log(`[OPC-UA Server] Server started and listening on ${server.getEndpointUrl()}`);
  console.log(`[OPC-UA Server] Primary endpoint: ${config.opcua.endpoint}`);

  // Simulation Loop - Updates every 500ms for high resolution
  console.log("[OPC-UA Server] Starting simulation loop...");
  setInterval(() => {
    Object.keys(config.devices).forEach((deviceKey) => {
      const device = config.devices[deviceKey];
      
      let value: number;
      const rand = Math.random();
      
      // Fault Injection Logic
      if (rand < device.faultProbability) {
        // Simulate Spike (Critical)
        value = device.max + (Math.random() * 20);
        device.currentStatus = "CRITICAL";
        console.log(`[OPC-UA Server] FAULT INJECTED: Spike on ${device.name} -> ${value.toFixed(2)}`);
      } else if (rand < device.faultProbability * 2) {
        // Simulate Drift/Noise (Warning)
        const drift = (Math.random() * 10) - 5;
        value = device.currentValue + drift;
        device.currentStatus = value > device.thresholds.warning ? "WARNING" : "NORMAL";
      } else if (rand < 0.005) {
        // Occasional No-Data simulation (Null)
        value = 0;
        device.currentStatus = "CRITICAL";
        console.log(`[OPC-UA Server] FAULT INJECTED: No-Data on ${device.name}`);
      } else {
        // Normal behavior (random walk)
        const current = device.currentValue || (device.min + device.max) / 2;
        const jitter = (Math.random() * 2 - 1) * 0.5;
        value = current + jitter;
        
        // Clamp to realistic ranges
        value = Math.max(device.min - 5, Math.min(device.max + 5, value));
        
        // Determine status based on thresholds
        if (value >= device.thresholds.critical) {
          device.currentStatus = "CRITICAL";
        } else if (value >= device.thresholds.warning) {
          device.currentStatus = "WARNING";
        } else {
          device.currentStatus = "NORMAL";
        }
      }

      device.currentValue = value;
      
      // Explicitly notify address space of change if needed (though 'get' handles it on read/poll)
      // For subscriptions, node-opcua handles it if the value changes
    });
  }, 500);

  return server;
}

export function triggerManualFault() {
  console.log("[OPC-UA Server] Manual fault trigger received");
  Object.keys(config.devices).forEach((deviceKey) => {
    const device = config.devices[deviceKey];
    device.currentValue = device.max + 25 + Math.random() * 10;
    device.currentStatus = "CRITICAL";
  });
}
