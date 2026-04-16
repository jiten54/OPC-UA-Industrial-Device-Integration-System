# ⚙️ OPC-UA Device Integration & Monitoring System
<img width="1913" height="866" alt="Screenshot 2026-04-16 080748" src="https://github.com/user-attachments/assets/6b880002-18bb-4b4a-8fa7-6a4a7536209f" />
![Uploading Screenshot 2026-04-16 080827.png…]()

> A production-grade industrial control system demonstrating real-time device integration, OPC-UA communication, anomaly detection, and live monitoring.

---

## 🚀 Overview

The **OPC-UA Device Integration & Monitoring System** is designed to simulate and integrate industrial devices using the OPC-UA protocol, enabling real-time data acquisition, processing, and visualization.

The system replicates a complete industrial pipeline:

**Device Simulation → OPC-UA Server → OPC-UA Client → Integration Engine → Dashboard**

It demonstrates how modern industrial control systems ensure **reliability, scalability, and real-time diagnostics**.

---

## 🧠 System Objective

* Simulate industrial devices generating real-time telemetry
* Integrate devices using OPC-UA standards
* Monitor and process data via a client system
* Detect anomalies and generate alerts
* Visualize system behavior through a live dashboard

---

## 🏗️ Architecture

```text
[Device Simulation Layer]
        ↓
[OPC-UA Server]
        ↓
[OPC-UA Client (Subscription-Based)]
        ↓
[Integration & Processing Engine]
        ↓
[WebSocket Streaming]
        ↓
[React Dashboard]
```

---

## ⚙️ System Components

### 🔹 1. Device Simulation Layer

* Simulates industrial sensors:

  * Temperature
  * Pressure
  * Voltage
* Generates real-time values (~500ms update interval)
* Supports:

  * Configurable thresholds
  * Fault injection (spikes, drift, noise, null data)

---

### 🔹 2. OPC-UA Server (Integration Core)

* Built using **node-opcua**
* Implements structured namespace:

```
Objects
 └── Devices
      ├── Device_1
      │    ├── Temperature
      │    ├── Pressure
      │    └── Voltage
```

* Features:

  * Real-time node updates
  * Namespace registration
  * Writable variable nodes
  * Continuous data streaming

---

### 🔹 3. OPC-UA Client (Monitoring Layer)

* Uses **subscription-based model (no polling)**
* Dynamically discovers nodes
* Subscribes to data changes
* Handles:

  * Real-time telemetry
  * Connection retries
  * Auto-reconnection

---

### 🔹 4. Integration & Processing Engine

* Processes incoming data streams
* Implements rule-based anomaly detection
* Classifies system states:

  * NORMAL
  * WARNING
  * CRITICAL

#### Example Event:

```json
{
  "id": "D01-temperature-1776254110249",
  "device_id": "D01",
  "metric": "temperature",
  "value": 92.5,
  "status": "CRITICAL",
  "timestamp": 1776254110249
}
```

---

### 🔹 5. Real-Time Dashboard

* Built with **React + Tailwind CSS**
* Features:

  * Live telemetry visualization
  * Sensor cards with trend charts
  * System status indicators
  * Event logs (persistent)
  * Active node monitoring

---

## 🔥 Key Features

### ✅ Real-Time OPC-UA Integration

* Subscription-based data acquisition
* Low-latency communication

---

### ⚡ Fault Injection System

* Simulates:

  * Sudden spikes
  * Sensor drift
  * Noise
  * Data loss

---

### 📊 Live Monitoring Dashboard

* Real-time metrics
* Visual alerts
* System logs

---

### 🧠 Anomaly Detection

* Threshold-based classification
* Real-time event generation

---

### 🔁 Fault-Tolerant Design

* Auto-reconnection (client)
* Retry mechanisms
* Graceful shutdown

---

### 📈 Active Node Tracking

* Displays:

  * Connected devices
  * Active nodes (>0 validation)

---

## 🛠️ Tech Stack

| Layer         | Technology            |
| ------------- | --------------------- |
| Backend       | Node.js, Express      |
| OPC-UA        | node-opcua            |
| Frontend      | React, Tailwind CSS   |
| Communication | Socket.IO, WebSockets |
| Data Format   | JSON                  |
| Logging       | File-based logging    |

---

## 📁 Project Structure

```
opcua-integration-system/
│
├── server/
│   ├── opcua_server.ts
│   ├── opcua_client.ts
│   └── server.ts
│
├── src/
│   └── App.tsx
│
├── config/
│   └── config.json
│
├── logs/
│   └── system.log
│
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/jiten54/OPC-UA-Industrial-Device-Integration-System
cd OPC-UA-Industrial-Device-Integration-System
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Run the System

```bash
npm run dev
```

---

### 4. Access Dashboard

* Open browser → `http://localhost:3000`

---

## 🎯 Use Cases

* Industrial automation systems
* Device integration platforms
* Real-time monitoring dashboards
* Control system simulation
* Reliability testing environments

---

## 🚀 Benefits

* Demonstrates **industrial protocol (OPC-UA) expertise**
* Shows **real-time system integration skills**
* Implements **fault detection and diagnostics**
* Reflects **production-grade architecture**
* Strong alignment with **industrial and scientific systems (e.g., CERN)**

---

## 🧠 Engineering Principles

* Real-time processing
* Event-driven architecture
* Fault tolerance
* Modular design
* System observability
* Reliable communication

---

## 🔮 Future Enhancements

* CAN bus integration
* OPC-UA security (certificates)
* Time-series database integration
* Kubernetes deployment
* Advanced predictive analytics

---

## 👤 Author

**Jiten Moni Das**

* GitHub: https://github.com/jiten54
* LinkedIn: https://www.linkedin.com/in/jiten-moni-das-01b3a032b

---

## 🌍 Inspiration

This project reflects real-world industrial control systems used in large-scale environments where **reliability, integration, and real-time monitoring are critical**.

---

## ⭐ Final Note

This system demonstrates a complete industrial lifecycle — from device simulation to real-time monitoring — showcasing practical expertise in **OPC-UA integration and system engineering**.
