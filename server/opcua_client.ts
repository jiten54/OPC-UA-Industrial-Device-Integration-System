import { OPCUAClient, AttributeIds, ClientSubscription, TimestampsToReturn, MonitoringParametersOptions, DataValue, ClientSession, MessageSecurityMode, SecurityPolicy } from "node-opcua";
import { Server } from "socket.io";
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'config/config.json'), 'utf8'));

// Event Generator / Integration Engine
function generateEvent(deviceConfig: any, value: number, status: string) {
  const timestamp = Date.now();
  const event = {
    id: `${deviceConfig.id}-${status}-${timestamp}`,
    device_id: deviceConfig.id,
    metric: deviceConfig.name.split(' ')[0].toLowerCase(),
    value: parseFloat(value.toFixed(2)),
    status: status,
    timestamp: timestamp,
    unit: deviceConfig.unit
  };

  // Log event if it's an anomaly
  if (status !== 'NORMAL') {
    console.log(`[Integration Engine] ANOMALY DETECTED: ${JSON.stringify(event)}`);
    const logMsg = `[${new Date(timestamp).toISOString()}] EVENT: ${status} on ${deviceConfig.name} (${value.toFixed(2)}${deviceConfig.unit})\n`;
    fs.appendFileSync(path.join(process.cwd(), 'logs/system.log'), logMsg);
  }

  return event;
}

export async function startOpcuaClient(io: Server) {
  console.log("[OPC-UA Client] Starting...");
  
  const client = OPCUAClient.create({
    endpointMustExist: false,
    connectionStrategy: {
      maxRetry: 10,
      initialDelay: 1000,
      maxDelay: 10000
    }
  });

  const endpointUrl = config.opcua.endpoint;

  // Move event listeners outside to avoid duplicates on retry
  (client as any).on("connection_lost", () => {
    console.log("[OPC-UA Client] Connection lost");
  });

  (client as any).on("backoff", (count: number, delay: number) => {
    console.log(`[OPC-UA Client] Attempting to reconnect (${count})... next attempt in ${delay}ms`);
  });

  (client as any).on("connection_reestablished", () => {
    console.log("[OPC-UA Client] Reconnected to server");
  });

  const connectAndSubscribe = async () => {
    try {
      console.log(`[OPC-UA Client] Connecting to ${endpointUrl}...`);
      
      // Attempt to connect only if not already connected
      try {
        await client.connect(endpointUrl);
      } catch (connErr: any) {
        if (connErr.message.includes("connected") || connErr.message.includes("state = connected")) {
          console.log("[OPC-UA Client] Client is already in a connected state.");
        } else {
          throw connErr;
        }
      }

      const session = await client.createSession();
      console.log("[OPC-UA Client] Session created");

      const subscription = ClientSubscription.create(session, {
        requestedPublishingInterval: 500,
        requestedLifetimeCount: 100,
        requestedMaxKeepAliveCount: 10,
        maxNotificationsPerPublish: 100,
        publishingEnabled: true,
        priority: 10
      });

      subscription.on("started", () => {
        console.log("[OPC-UA Client] Subscription active - ID:", subscription.subscriptionId);
      });

      subscription.on("status_changed", (status) => {
        console.log("[OPC-UA Client] Subscription status changed:", status.toString());
      });

      // Browse for the "Devices" folder
      console.log("[OPC-UA Client] Browsing for 'Devices' folder in Objects...");
      const browseResult = await session.browse("ObjectsFolder");
      console.log(`[OPC-UA Client] Browse ObjectsFolder result: found ${browseResult.references?.length || 0} references`);
      
      const devicesFolder = browseResult.references?.find(r => r.browseName.name === "Devices");

      if (!devicesFolder) {
        console.error("[OPC-UA Client] CRITICAL: Could not find 'Devices' folder on server. References found:", 
          browseResult.references?.map(r => r.browseName.toString()).join(", "));
        throw new Error("Could not find 'Devices' folder on server");
      }

      console.log("[OPC-UA Client] Found 'Devices' folder. Subscribing to nodes...");

      // Subscribe to each device under the folder
      const deviceBrowseResult = await session.browse(devicesFolder.nodeId.toString());
      console.log(`[OPC-UA Client] Browse Devices folder result: found ${deviceBrowseResult.references?.length || 0} devices`);
      
      for (const deviceRef of (deviceBrowseResult.references || [])) {
        const deviceName = deviceRef.browseName.name!;
        console.log(`[OPC-UA Client] Inspecting device node: ${deviceName}`);
        const deviceConfig = Object.values(config.devices).find((d: any) => d.name === deviceName) as any;

        if (!deviceConfig) {
          console.warn(`[OPC-UA Client] No config found for device: ${deviceName}`);
          continue;
        }

        console.log(`[OPC-UA Client] Subscribing to device: ${deviceName}`);

        const components = await session.browse(deviceRef.nodeId.toString());
        console.log(`[OPC-UA Client] Device ${deviceName} has ${components.references?.length || 0} components`);
        
        const valueNode = components.references?.find(r => r.browseName.name === "Value");
        const statusNode = components.references?.find(r => r.browseName.name === "Status");

        if (valueNode) {
          const monitoredItem = await subscription.monitor(
            { nodeId: valueNode.nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 250, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both
          );

          monitoredItem.on("changed", (dataValue: DataValue) => {
            const value = dataValue.value.value;
            // console.log(`[OPC-UA Client] Data changed for ${deviceConfig.name}: ${value}`);
            
            // We need the latest status to generate a full event, 
            // but for now we'll emit the raw data and let the integration engine handle it
            const event = generateEvent(deviceConfig, value, "NORMAL"); // Status will be updated by status subscription
            
            // Log every update for debugging
            const debugMsg = `[${new Date().toISOString()}] DEBUG: ${deviceConfig.name} = ${value.toFixed(2)}\n`;
            fs.appendFileSync(path.join(process.cwd(), 'logs/system.log'), debugMsg);

            io.emit('device_data', {
              ...event,
              deviceName: deviceConfig.name // For UI compatibility
            });
          });
        }

        if (statusNode) {
          const monitoredStatus = await subscription.monitor(
            { nodeId: statusNode.nodeId, attributeId: AttributeIds.Value },
            { samplingInterval: 250, discardOldest: true, queueSize: 10 },
            TimestampsToReturn.Both
          );

          monitoredStatus.on("changed", (dataValue: DataValue) => {
            const status = dataValue.value.value;
            io.emit('device_status', {
              deviceId: deviceConfig.id,
              status: status
            });
            
            // If status is not normal, generate an anomaly event
            if (status !== 'NORMAL') {
              // We don't have the value here easily without caching, 
              // but the UI will see the status update
            }
          });
        }
      }

    } catch (err) {
      console.error("[OPC-UA Client] Error:", err);
      setTimeout(() => {
        connectAndSubscribe().catch(console.error);
      }, 5000);
    }
  };

  await connectAndSubscribe();
}
