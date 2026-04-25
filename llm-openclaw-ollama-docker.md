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
- **Docker Compose:** Multi-container orchestration

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

## III. Docker Commands & Configuration

### Ollama Container Setup

#### Basic Ollama (CPU-only)
```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

#### Ollama with GPU Support (Recommended)
```bash
docker run -d \
  --name ollama \
  --gpus all \
  -v ollama_data:/root/.ollama \
  -p 11434:11434 \
  -e OLLAMA_HOST=0.0.0.0 \
  ollama/ollama
```

#### Download and Test Models
```bash
# Pull Llama 3.2 (fast, lightweight)
docker exec -it ollama ollama pull llama3.2

# Pull Llama 3.3 70B (better for agents, uses ~8-10GB VRAM)
docker exec -it ollama ollama pull llama3.3:70b

# Test model interaction
docker exec -it ollama ollama run llama3.2 "Say 'Ollama is alive' if you can hear me"

# Check GPU usage while model is running
docker exec -it ollama nvidia-smi
```

### OpenClaw Container Setup

#### Standalone OpenClaw
```bash
# Create required directories
mkdir -p openclaw-config workspace
sudo chown -R 1000:1000 openclaw-config workspace

# Run OpenClaw container
docker run -d \
  --name openclaw \
  -e OLLAMA_API_KEY="ollama-local" \
  -e OLLAMA_HOST="http://host.docker.internal:11434" \
  -e OPENCLAW_GATEWAY_BIND="lan" \
  -v $(pwd)/openclaw-config:/home/node/.openclaw \
  -v $(pwd)/workspace:/home/node/.openclaw/workspace \
  -p 18789:18789 \
  --add-host=host.docker.internal:host-gateway \
  --restart unless-stopped \
  ghcr.io/openclaw/openclaw:latest
```

### Complete Stack with Docker Compose

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

## IV. Configuration & Authentication

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

# Set correct Ollama URL
docker exec -it openclaw openclaw config set models.providers.ollama.baseUrl "http://host.docker.internal:11434"

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

## V. Testing & Verification

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

## VI. Common Problems & Solutions

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
**Solution:**
```bash
# Restart Ollama with correct host binding
docker stop ollama && docker rm ollama
docker run -d --name ollama --gpus all -v ollama:/root/.ollama -p 11434:11434 -e OLLAMA_HOST=0.0.0.0 ollama/ollama

# Update OpenClaw configuration
docker exec -it openclaw openclaw config set models.providers.ollama.baseUrl "http://host.docker.internal:11434"
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

## VII. Docker Management Commands

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

## VIII. Advanced Features

### Web Search Integration
OpenClaw can provide internet search capabilities to local models:

```yaml
# Add to OpenClaw environment in docker-compose.yml
environment:
  - TAVILY_API_KEY=tvly-xxxxxxxxx  # Sign up at tavily.com
  - GOOGLE_API_KEY=AIza...         # Alternative: Google Search API
  - GOOGLE_CSE_ID=...
```

### Business Service Integration
Example Go service communication:
```go
// Connect to OpenClaw from your Go service
func callAgent() {
    resp, err := http.Get("http://openclaw:8080/v1/chat")
    if err != nil {
        log.Fatalf("Couldn't find the agent: %v", err)
    }
    // Handle response
}
```

---

## IX. Performance Optimization

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

## X. Troubleshooting Quick Reference

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