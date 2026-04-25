# OpenClaw-Ollama-Docker Stack: Complete Setup Guide
**Timestamp:** 2026-04-25  
**Environment:** RTX 5060 Ti (16GB VRAM) | WSL2 Ubuntu | 550W PSU

---

## Overview
This guide documents the complete process of setting up a microservice stack with:
- **Ollama** (Local LLM Brain in Docker)
- **OpenClaw** (Agent Framework in Docker) 
- **Business Service** (Your Go/React API)
- All containers communicating through Docker networks with GPU acceleration

---

## I. Tools & Prerequisites

### Core Requirements
1. **Hardware:** NVIDIA RTX 5060 Ti (16GB VRAM)
2. **OS:** Windows 11 with WSL2 enabled
3. **Container Runtime:** Docker Desktop for Windows
4. **Linux Distro:** Ubuntu (latest LTS) - recommended for AI/ML compatibility

### Software Stack
- **Ollama:** Local LLM inference engine
- **OpenClaw:** Agent framework with web search capabilities  
- **NVIDIA Container Toolkit:** GPU passthrough for Docker
- **Docker:** Container Engine

---

## Summary Steps

1. **Enable WSL2 + Install Ubuntu** - Set up virtualization in BIOS, enable Windows features, install Ubuntu
2. **Install Docker Desktop** - Configure WSL2 integration and resource allocation  
3. **Create Docker Network** - `docker network create ai-stack` for container communication
4. **Deploy Ollama** - Run with GPU support and download models (Llama 3.2/3.3)
5. **Deploy OpenClaw** - Configure to connect to Ollama via Docker network
6. **Authentication** - Extract gateway token and configure providers in OpenClaw UI
7. **Test & Verify** - Confirm GPU access, model loading, and container communication

**Total Time:** ~30-45 minutes | **VRAM Usage:** 8-12GB | **Disk:** ~10-15GB

---

## II. Initial Setup

### 1. Enable WSL2 and Install Ubuntu
**Problem:** WSL2 requires virtualization enabled in BIOS

```powershell
# Enable Windows features
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux

# Install Ubuntu
wsl --install -d Ubuntu
```

**Fix for "WSL2 not supported" error:**
1. Enter BIOS (F2/Delete during boot)
2. Enable SVM Mode (AMD) or Intel VT-x (Intel) 
3. Enable "Virtual Machine Platform" in Windows Features
4. Restart and try installation again

### 2. Ubuntu Initial Configuration
```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install development essentials
sudo apt install -y build-essential curl git python3 python3-pip

# Verify GPU passthrough
nvidia-smi
```

### 3. Docker Desktop Setup
- Install Docker Desktop for Windows
- Enable WSL2 integration 
- Allocate sufficient RAM in Docker Settings > Resources

---

## III. Docker Network Setup (Preferred Method)

### 1. Create Custom Docker Network
First, create a dedicated network for your containers to communicate:

```bash
# Create the network
docker network create ai-stack

# Verify network creation
docker network ls
```

### 2. Deploy Ollama on Network

```bash
# Run Ollama with custom network
docker run -d \
  --name ollama \
  --network ai-stack \
  --gpus all \
  -v ollama_data:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_HOST=0.0.0.0 \
  ollama/ollama

# Download models
docker exec -it ollama ollama pull llama3.2
docker exec -it ollama ollama pull llama3.3:70b
```

### 3. Deploy OpenClaw on Same Network

```bash
# Create required directories
mkdir -p openclaw-config workspace
sudo chown -R 1000:1000 openclaw-config workspace

# Run OpenClaw connected to the same network
docker run -d \
  --name openclaw \
  --network ai-stack \
  -e OLLAMA_API_KEY="ollama-local" \
  -e OLLAMA_HOST="http://ollama:11434" \
  -e OPENCLAW_GATEWAY_BIND="lan" \
  -v $(pwd)/openclaw-config:/home/node/.openclaw \
  -v $(pwd)/workspace:/home/node/.openclaw/workspace \
  -p 18789:18789 \
  --restart unless-stopped \
  ghcr.io/openclaw/openclaw:latest
```

### 4. Deploy Your Business Service

```bash
# Run your Go/React service on the same network
docker run -d \
  --name business-service \
  --network ai-stack \
  -e AGENT_URL="http://openclaw:8080" \
  -p 3000:3000 \
  your-business-app:latest
```

### 5. Network Communication Benefits

**Container-to-Container URLs:**
- Business Service → OpenClaw: `http://openclaw:8080`
- OpenClaw → Ollama: `http://ollama:11434`
- Host → Any service: `http://localhost:PORT`

**No host.docker.internal needed** - containers resolve each other by name within the network.

---

## IV. Alternative: Docker Compose (Optional)

For those who prefer declarative configuration:

### Network Management Commands

```bash
# List all networks
docker network ls

# Inspect network details
docker network inspect ai-stack

# Connect existing container to network
docker network connect ai-stack container_name

# Disconnect container from network
docker network disconnect ai-stack container_name

# Remove network (containers must be stopped first)
docker network rm ai-stack
```

### Testing Network Communication

```bash
# Test from OpenClaw to Ollama
docker exec -it openclaw curl http://ollama:11434/api/version

# Test model interaction through network
docker exec -it ollama ollama run llama3.2 "Say 'Network is working' if you can hear me"

# Check all containers on the network
docker network inspect ai-stack --format='{{json .Containers}}'
```

#### docker-compose.yml
```yaml
services:
  # THE BRAIN: Ollama
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_HOST=0.0.0.0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  # THE AGENT: OpenClaw
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    container_name: openclaw
    environment:
      - OLLAMA_API_KEY=ollama-local
      - OLLAMA_HOST=http://ollama:11434
      - OPENCLAW_GATEWAY_BIND=lan
      - TAVILY_API_KEY=your_key_here  # For web search
    volumes:
      - ./openclaw-config:/home/node/.openclaw
      - ./workspace:/workspace
    ports:
      - "18789:18789"
    depends_on:
      - ollama

  # YOUR BUSINESS SERVICE
  business-service:
    build: ./my-business-app
    container_name: business_logic
    environment:
      - AGENT_URL=http://openclaw:8080
    depends_on:
      - openclaw
    ports:
      - "3000:3000"

volumes:
  ollama_data:
```

#### Launch Complete Stack
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

---

## V. Configuration & Authentication

### OpenClaw Configuration

#### Extract Gateway Token
```bash
# Get the token for UI access
docker exec openclaw cat /home/node/.openclaw/openclaw.json | grep -A 5 "gateway"
```

#### Configure Ollama Provider
```bash
# Set Ollama as primary model
docker exec -it openclaw openclaw config set agents.defaults.model.primary "ollama/llama3.2"

# Set correct Ollama URL (using Docker network)
docker exec -it openclaw openclaw config set models.providers.ollama.baseUrl "http://ollama:11434"

# Pair with Ollama
docker exec -it openclaw openclaw gateway pair ollama --token ollama-local

# Test connection
docker exec -it openclaw openclaw models status --probe
```

#### Access OpenClaw Dashboard
1. Open browser: `http://localhost:18789`
2. Enter token from previous step
3. Go to Settings > Providers
4. Verify Ollama shows green status

---

## VI. Testing & Verification

### Container Health Checks
```bash
# Check running containers
docker ps

# Verify GPU access in Ollama
docker exec -it ollama nvidia-smi

# Test Ollama model
docker exec -it ollama ollama run llama3.2 "What is 2+2?"

# Test OpenClaw inference
docker exec -it openclaw openclaw infer "Who are you?"
```

### Network Communication Test
```bash
# Test container-to-container communication
docker exec -it openclaw curl http://ollama:11434/api/version
```

---

## VII. Common Problems & Solutions

### Problem 1: "WSL2 not supported with your current machine configuration"
**Cause:** Virtualization disabled in BIOS
**Solution:**
1. Restart and enter BIOS/UEFI
2. Enable SVM Mode (AMD) or VT-x (Intel)
3. Enable Virtual Machine Platform in Windows Features
4. Run: `wsl.exe --install --no-distribution`

### Problem 2: "gpus not recognized" in Docker
**Cause:** NVIDIA Container Toolkit not installed
**Solution:**
```bash
# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update && sudo apt install -y nvidia-docker2
sudo systemctl restart docker
```

### Problem 3: "Unauthorized: gateway token missing"
**Cause:** OpenClaw security requires authentication token
**Solution:**
1. Extract token: `docker exec openclaw cat /home/node/.openclaw/openclaw.json | grep token`
2. Access with token: `http://localhost:18789/?token=YOUR_TOKEN`

### Problem 4: "Ollama could not be reached at http://127.0.0.1:11434"
**Cause:** Container networking misconfiguration
**Solution with Custom Network:**
```bash
# Method 1: Restart containers on same network
docker stop ollama openclaw
docker rm ollama openclaw

# Create network
docker network create ai-stack

# Restart with network
docker run -d --name ollama --network ai-stack --gpus all -v ollama:/root/.ollama -p 11434:11434 -e OLLAMA_HOST=0.0.0.0 ollama/ollama
docker run -d --name openclaw --network ai-stack -e OLLAMA_HOST="http://ollama:11434" -p 18789:18789 -v $(pwd)/openclaw-config:/home/node/.openclaw ghcr.io/openclaw/openclaw:latest

# Test network communication
docker exec -it openclaw curl http://ollama:11434/api/version
```

### Problem 5: "No API key found for provider 'openai'"
**Cause:** OpenClaw defaults to OpenAI instead of local Ollama
**Solution:**
```bash
# Set Ollama as primary provider
docker exec -it openclaw openclaw config set agents.defaults.model.primary "ollama/llama3.2"

# Or configure in UI: Settings > Agents > main > Primary Model
```

### Problem 6: Native Ollama conflicts with Docker version
**Cause:** Port 11434 occupied by system-installed Ollama
**Solution:**
```bash
# Uninstall native Ollama
sudo systemctl stop ollama
sudo systemctl disable ollama
sudo rm $(which ollama)
sudo rm /etc/systemd/system/ollama.service
sudo rm -rf /usr/share/ollama
sudo userdel ollama
```

---

## VIII. Docker Management Commands

### Container Management
```bash
# Restart Docker daemon (Windows)
# Right-click Docker whale icon > Restart Docker Desktop

# Force restart via PowerShell (as Admin)
taskkill /F /IM "Docker Desktop.exe"
wsl --shutdown
start "C:\Program Files\Docker\Docker Desktop\Docker Desktop.exe"

# View container logs
docker logs ollama
docker logs openclaw

# Monitor resource usage
docker stats

# Kill specific containers
docker stop ollama openclaw
docker rm ollama openclaw
```

### Volume Management
```bash
# List volumes
docker volume ls

# Backup Ollama models
docker run --rm -v ollama_data:/source -v $(pwd):/backup ubuntu tar czf /backup/ollama-backup.tar.gz /source

# Restore models
docker run --rm -v ollama_data:/target -v $(pwd):/backup ubuntu tar xzf /backup/ollama-backup.tar.gz -C /target --strip 1
```

---

## IX. Advanced Features

### Web Search Integration
OpenClaw can provide internet search capabilities to local models:

```yaml
# Add to OpenClaw environment in docker-compose.yml
environment:
  - TAVILY_API_KEY=tvly-xxxxxxxxx  # Sign up at tavily.com
  - GOOGLE_API_KEY=AIza...         # Alternative: Google Search API
  - GOOGLE_CSE_ID=...
```

---

## X. Performance Optimization

### VRAM Management (RTX 5060 Ti - 16GB)
- **Llama 3.2 (3B):** ~2GB VRAM
- **Llama 3.3 (70B Quantized):** ~8-10GB VRAM  
- **Reserve:** 6GB for business service GPU tasks

### Resource Allocation
```bash
# Limit container memory if needed
docker run --memory="8g" --gpus all ollama/ollama

# Monitor GPU memory
watch -n 1 nvidia-smi
```

---

## XI. Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Container won't start | `docker compose down && docker compose up -d` |
| GPU not detected | Check `nvidia-smi` in container |
| Port conflicts | Kill process: `netstat -ano \| findstr :11434` |
| Permission denied | `sudo chown -R 1000:1000 ./openclaw-config` |
| Model not found | `docker exec -it ollama ollama pull MODEL_NAME` |
| Network issues | Add `--add-host=host.docker.internal:host-gateway` |

---

**Total Setup Time:** ~30-45 minutes  
**Disk Space Required:** ~10-15GB (including models)  
**Memory Usage:** ~4-6GB RAM + 8-12GB VRAM