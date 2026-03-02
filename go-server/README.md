# GPU Controller Server

GPU 資源管理系統的後端服務，使用 Go 語言和 Gin 框架開發。提供完整的 RESTful API 來管理 GPU 資源、容器、MIG 分區以及系統監控功能。

## 🎯 功能特色

### 核心服務
- **🔗 SSH 連線管理** - 安全的遠端 GPU 服務器連線
- **📊 GPU 監控** - 即時 GPU 使用狀態與效能指標
- **🎛️ MIG 管理** - Multi-Instance GPU 分區創建與管理
- **🐳 容器管理** - Docker 容器的完整生命週期管理
- **🖼️ 映像管理** - Docker 映像檔的拉取、推送與管理
- **📝 日誌服務** - 系統操作與錯誤日誌記錄
- **📈 監控服務** - Prometheus 指標暴露

### API 功能
- **連線測試** - SSH 連線狀態與延遲檢測
- **資源分配** - GPU 資源的動態分配與回收
- **容器編排** - 容器的創建、啟動、停止與刪除
- **效能監控** - GPU 使用率、記憶體、溫度等指標收集
- **日誌管理** - 遠端日誌文件的讀取與分析

## 🏗️ 架構設計

```
internal/
├── config/                 # 配置管理
│   └── config.go          # 環境變數與設定載入
├── handler/               # HTTP 處理器層
│   ├── connection_handler.go    # 連線管理 API
│   ├── gpu_handler.go          # GPU 監控 API
│   ├── mig_handler.go          # MIG 管理 API
│   ├── container_handler.go    # 容器管理 API
│   ├── image_handler.go        # 映像管理 API
│   ├── log_handler.go          # 日誌服務 API
│   └── monitoring_handler.go   # 監控服務 API
├── service/               # 業務邏輯層
│   ├── connection_service.go   # 連線服務
│   ├── gpu_service.go         # GPU 服務
│   ├── mig_service.go         # MIG 服務
│   ├── container_service.go   # 容器服務
│   ├── image_service.go       # 映像服務
│   ├── log_service.go         # 日誌服務
│   ├── monitoring_service.go  # 監控服務
│   └── remote_logger.go       # 遠端日誌記錄器
├── model/                 # 資料模型
│   └── model.go          # API 請求/回應模型
└── ssh/                   # SSH 客戶端
    └── client.go         # SSH 連線與命令執行
```

## 🛠️ 技術棧

- **語言**: Go 1.25.4
- **框架**: Gin Web Framework v1.9.1
- **HTTP**: RESTful API with JSON
- **SSH**: golang.org/x/crypto/ssh
- **配置**: godotenv for environment variables
- **監控**: Prometheus metrics endpoint
- **日誌**: 結構化日誌記錄
- **CORS**: gin-contrib/cors

## 🚀 快速開始

### 系統需求

- Go 1.25.4 或更高版本
- 有 GPU 的 Linux 服務器
- Docker with NVIDIA Runtime
- SSH 訪問權限到 GPU 服務器

### 1. 環境設定

1. **克隆專案**
```bash
git clone <repository-url>
cd gpu-contrl/go-server
```

2. **安裝依賴**
```bash
go mod tidy
```

3. **設定環境變數**
```bash
cp .env.example .env
nano .env
```

編輯 `.env` 文件：
```env
# SSH 連線設定
SSH_HOSTNAME=your.gpu.server.com
SSH_USERNAME=your_username
SSH_PASSWORD=your_password
SSH_PORT=22

# 日誌設定
LOG_REMOTE_PATH=/var/log/gpu-controller
LOG_BACKUP_PATH=./logs
LOG_ENABLED=true
LOG_DEBUG_MODE=false

# 服務器設定
PORT=8080
GIN_MODE=release
```

### 2. 開發模式啟動

```bash
# 開發模式（熱重載）
go run cmd/server/main.go

# 或者建構並執行
go build -o gpu-controller cmd/server/main.go
./gpu-controller
```

### 3. 生產部署

```bash
# 建構優化版本
CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o gpu-controller cmd/server/main.go

# 使用 systemd 建立服務
sudo cp gpu-controller /usr/local/bin/
sudo cp gpu-controller.service /etc/systemd/system/
sudo systemctl enable gpu-controller
sudo systemctl start gpu-controller
```

## 📋 API 文檔

### 基礎 API

#### 健康檢查
```http
GET /health
```

回應：
```json
{
  "status": "ok",
  "timestamp": "2024-03-02T10:00:00Z"
}
```

### 連線管理 API

#### 測試 SSH 連線
```http
POST /api/connection/test
```

回應：
```json
{
  "success": true,
  "latency": "45ms",
  "server_info": {
    "hostname": "gpu-server-01",
    "uptime": "15 days, 3:45",
    "load_average": "0.85 0.74 0.68"
  }
}
```

#### 執行遠端命令
```http
POST /api/connection/execute
Content-Type: application/json

{
  "command": "nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv"
}
```

### GPU 監控 API

#### 獲取 GPU 狀態
```http
GET /api/gpu/status
```

回應：
```json
{
  "gpus": [
    {
      "id": 0,
      "name": "NVIDIA RTX 4090",
      "memory_used": 8192,
      "memory_total": 24576,
      "utilization": 75,
      "temperature": 68,
      "power_usage": 320,
      "mig_enabled": true
    }
  ],
  "total_gpus": 8,
  "available_memory": 163840
}
```

#### 獲取 GPU 指標
```http
GET /api/gpu/metrics
```

### MIG 管理 API

#### 創建 MIG 實例
```http
POST /api/mig/create
Content-Type: application/json

{
  "gpu_id": 0,
  "profile": "1g.5gb",
  "count": 2
}
```

#### 列出 MIG 實例
```http
GET /api/mig/list
```

#### 刪除 MIG 實例
```http
DELETE /api/mig/{mig_id}
```

### 容器管理 API

#### 列出容器
```http
GET /api/containers
```

#### 創建容器
```http
POST /api/containers
Content-Type: application/json

{
  "image": "nvidia/cuda:11.8-runtime-ubuntu20.04",
  "gpu_ids": [0, 1],
  "memory_limit": "8g",
  "environment": {
    "CUDA_VISIBLE_DEVICES": "0,1"
  },
  "command": "python train.py"
}
```

#### 停止容器
```http
DELETE /api/containers/{container_id}
```

### 映像管理 API

#### 列出本地映像
```http
GET /api/images
```

#### 拉取映像
```http
POST /api/images/pull
Content-Type: application/json

{
  "image": "tensorflow/tensorflow:latest-gpu"
}
```

### 日誌服務 API

#### 獲取系統日誌
```http
GET /api/logs/system?lines=100&follow=true
```

#### 獲取容器日誌
```http
GET /api/logs/container/{container_id}?lines=50
```

### 監控服務 API

#### Prometheus 指標
```http
GET /metrics
```

## 🔧 配置說明

### 環境變數

| 變數名 | 必填 | 預設值 | 說明 |
|-------|------|-------|------|
| `SSH_HOSTNAME` | ✅ | - | GPU 服務器地址 |
| `SSH_USERNAME` | ✅ | - | SSH 用戶名 |
| `SSH_PASSWORD` | ✅ | - | SSH 密碼 |
| `SSH_PORT` | ❌ | 22 | SSH 端口 |
| `LOG_REMOTE_PATH` | ❌ | /var/log/gpu-controller | 遠端日誌路徑 |
| `LOG_BACKUP_PATH` | ❌ | ./logs | 本地日誌路徑 |
| `LOG_ENABLED` | ❌ | true | 啟用日誌記錄 |
| `LOG_DEBUG_MODE` | ❌ | false | 調試模式 |
| `PORT` | ❌ | 8080 | 服務器端口 |
| `GIN_MODE` | ❌ | debug | Gin 模式 |

### SSH 密鑰認證

推薦使用 SSH 密鑰替代密碼認證：

1. **生成 SSH 密鑰**
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/gpu_controller
```

2. **部署公鑰到 GPU 服務器**
```bash
ssh-copy-id -i ~/.ssh/gpu_controller.pub user@gpu-server
```

3. **修改配置使用密鑰**
```env
SSH_KEY_PATH=/home/user/.ssh/gpu_controller
# 移除 SSH_PASSWORD 設定
```

## 🐳 Docker 部署

### Dockerfile
```dockerfile
FROM golang:1.25-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags '-extldflags "-static"' -o gpu-controller cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/gpu-controller .
CMD ["./gpu-controller"]
```

### 建構與執行
```bash
# 建構映像
docker build -t gpu-controller:latest .

# 執行容器
docker run -d \
  --name gpu-controller \
  -p 8080:8080 \
  -e SSH_HOSTNAME=your.gpu.server.com \
  -e SSH_USERNAME=your_username \
  -e SSH_PASSWORD=your_password \
  gpu-controller:latest
```

## 📊 監控與指標

### Prometheus 指標

服務暴露在 `/metrics` 端點的指標：

```prometheus
# GPU 使用率
gpu_utilization_percent{gpu_id="0",gpu_name="RTX 4090"} 75.5

# GPU 記憶體使用量
gpu_memory_used_bytes{gpu_id="0"} 8589934592

# 運行中容器數量
containers_running_total 12

# MIG 實例數量
mig_instances_total{gpu_id="0"} 4

# SSH 連線狀態
ssh_connection_status{hostname="gpu-server-01"} 1

# API 請求數量
http_requests_total{method="GET",endpoint="/api/gpu/status",status="200"} 1547
```

### 日誌格式

```json
{
  "timestamp": "2024-03-02T10:30:45Z",
  "level": "INFO",
  "service": "gpu-service",
  "message": "GPU status updated successfully",
  "gpu_id": 0,
  "utilization": 75.5,
  "request_id": "req-123456"
}
```

## 🔧 疑難排解

### 常見問題

1. **SSH 連線失敗**
```bash
# 測試 SSH 連線
ssh -p 22 username@hostname

# 檢查防火牆
sudo ufw status

# 檢查 SSH 服務
sudo systemctl status ssh
```

2. **GPU 檢測失敗**
```bash
# 檢查 NVIDIA 驅動
nvidia-smi

# 檢查 CUDA 安裝
nvcc --version

# 檢查容器運行時
docker info | grep nvidia
```

3. **權限錯誤**
```bash
# 檢查用戶權限
groups $USER

# 添加到 docker 群組
sudo usermod -aG docker $USER
```

### 效能調優

1. **連線池設定**
```go
// 在 config.go 中調整
const (
    MaxIdleConns    = 10
    MaxOpenConns    = 100
    ConnMaxLifetime = time.Hour
)
```

2. **日誌等級**
```env
# 生產環境關閉 DEBUG 日誌
LOG_DEBUG_MODE=false
GIN_MODE=release
```

## 🧪 測試

### 單元測試
```bash
go test ./internal/...
```

### 整合測試
```bash
go test -tags=integration ./test/integration/...
```

### 效能測試
```bash
go test -bench=. ./internal/service/...
```

## 🔄 開發指南

### 新增 API 端點

1. **定義模型** (internal/model/model.go)
```go
type NewFeatureRequest struct {
    Parameter string `json:"parameter" binding:"required"`
}

type NewFeatureResponse struct {
    Result string `json:"result"`
}
```

2. **實作服務** (internal/service/new_service.go)
```go
func (s *newService) ProcessFeature(req *model.NewFeatureRequest) (*model.NewFeatureResponse, error) {
    // 業務邏輯
    return &model.NewFeatureResponse{Result: "success"}, nil
}
```

3. **新增處理器** (internal/handler/new_handler.go)
```go
func (h *newHandler) HandleFeature(c *gin.Context) {
    var req model.NewFeatureRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    result, err := h.service.ProcessFeature(&req)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, result)
}
```

4. **註冊路由** (cmd/server/main.go)
```go
r.POST("/api/new-feature", newHandler.HandleFeature)
```

## 📄 授權條款

本專案採用 MIT 授權條款。詳見 [LICENSE](../LICENSE) 文件。

---

**Built with Go & Gin for High-Performance GPU Resource Management**