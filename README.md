# GPU Control System

一個完整的 GPU 資源管理系統，提供企業級的 GPU 資源監控、分配與管理功能。系統採用微服務架構，包含 Go 後端服務和 React 前端界面，支援多角色權限管理和完整的資源生命週期管理。

## 🚀 功能特色

### 🎯 多角色權限系統
- **管理員** - 完整系統管理權限
- **教師** - 教學專用功能（虛擬教室、學生管理）
- **實驗室** - 研究專用功能（專案管理、實驗排程）
- **一般用戶** - 基本資源使用功能

### 💻 核心功能
- **🔐 安全認證** - IAM 身份驗證與授權系統
- **📊 資源監控** - 即時 GPU 使用狀態與效能監控
- **🎛️ 資源分配** - MIG 分割與 GPU 聚合管理
- **🐳 容器管理** - Docker 容器的創建、監控與管理
- **📝 任務排程** - GPU 計算任務的智能排程系統
- **🖼️ 映像管理** - Docker Hub/Harbor 映像檔管理
- **📈 視覺化監控** - Prometheus + Grafana 整合儀表板
- **🔗 SSH 連線** - 安全的遠端連線服務

### 🎓 教育專用功能
- **虛擬教室** - 自動化教學環境佈建
- **週期性排程** - 智能課程時間管理
- **學生 GPU 分配** - 一鍵平均分配資源
- **實驗專案管理** - 研究專案與配額管控

## 🏗️ 系統架構

```
gpu-contrl/
├── go-server/                    # 後端服務 (Go + Gin)
│   ├── cmd/server/              # 應用程式入口
│   ├── internal/
│   │   ├── config/              # 配置管理
│   │   ├── handler/             # HTTP 處理器
│   │   ├── service/             # 業務邏輯層
│   │   ├── model/               # 資料模型
│   │   └── ssh/                 # SSH 客戶端
│   └── go.mod
├── gpu-ctrl-web/                # 前端應用 (React + Material UI)
│   ├── src/
│   │   ├── components/          # React 組件
│   │   │   ├── Admin/          # 管理員控制台
│   │   │   ├── Teacher/        # 教師控制台
│   │   │   ├── Lab/            # 實驗室控制台
│   │   │   └── ...
│   │   ├── services/           # API 服務層
│   │   └── styles/             # 樣式文件
│   └── package.json
└── README.md                     # 本文件
```

## 🛠️ 技術棧

### 後端 (go-server)
- **語言**: Go 1.25.4
- **框架**: Gin Web Framework
- **資源管理**: NVIDIA Docker, MIG (Multi-Instance GPU)
- **連線**: SSH (golang.org/x/crypto)
- **配置**: godotenv
- **監控**: Prometheus 集成

### 前端 (gpu-ctrl-web)
- **語言**: JavaScript/JSX
- **框架**: React 18.2.0
- **UI 庫**: Material UI 6.5.0
- **路由**: React Router DOM 6.22.3
- **狀態管理**: React Hooks
- **建構工具**: Create React App 5.0.1

## 🚀 快速開始

### 系統需求

- **作業系統**: Linux (Ubuntu 18.04+ 推薦)
- **GPU**: NVIDIA GPU (支援 CUDA)
- **軟體**:
  - Docker 20.0+
  - NVIDIA Docker Runtime
  - Go 1.25+ (開發環境)
  - Node.js 18+ & npm (開發環境)

### 1. 環境準備

#### 安裝 NVIDIA Docker 支援
```bash
# 安裝 NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

#### 驗證 GPU 支援
```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:11.8-runtime-ubuntu20.04 nvidia-smi
```

### 2. 專案部署

#### 方法一：開發環境部署

1. **克隆專案**
```bash
git clone <repository-url>
cd gpu-contrl
```

2. **後端設定**
```bash
cd go-server
cp .env.example .env
# 編輯 .env 設定 SSH 連線資訊
nano .env
```

3. **啟動後端服務**
```bash
go mod tidy
go run cmd/server/main.go
```

4. **前端設定**
```bash
cd ../gpu-ctrl-web
npm install
npm start
```

#### 方法二：生產環境部署

1. **建構後端**
```bash
cd go-server
go build -o gpu-controller cmd/server/main.go
```

2. **建構前端**
```bash
cd ../gpu-ctrl-web
npm run build
```

3. **部署**
```bash
# 使用 systemd 服務或 Docker 部署
# 具體部署方式請參考各子專案的 README.md
```

### 3. 系統配置

#### SSH 連線設定
編輯 `go-server/.env` 文件：
```env
SSH_HOSTNAME=your.gpu.server.com
SSH_USERNAME=gpuadmin
SSH_PASSWORD=your_password
SSH_PORT=22

LOG_REMOTE_PATH=/var/log/gpu-controller
LOG_BACKUP_PATH=./logs
LOG_ENABLED=true
LOG_DEBUG_MODE=false
```

#### 用戶權限配置
系統預設帳號（生產環境請務必修改）：
- **管理員**: `admin` / `admin`
- **教師**: `teacher` / `teacher`
- **實驗室**: `lab` / `lab`
- **用戶**: `demo_user` / `demo_user`

### 4. 存取系統

- **前端介面**: http://localhost:3000
- **後端 API**: http://localhost:8080
- **API 文檔**: http://localhost:8080/docs

## 📋 使用指南

### 管理員功能
1. **用戶管理** - 創建、編輯、刪除用戶帳號
2. **GPU 監控** - 即時檢視 GPU 使用狀況
3. **資源分配** - 管理 MIG 分區與 GPU 聚合
4. **任務排程** - 管理系統任務隊列
5. **配額管理** - 設定用戶資源配額
6. **系統日誌** - 查看操作與錯誤記錄

### 教師功能
1. **虛擬教室**
   - 創建教學環境
   - 設定週期性課程排程
   - 自動開啟/關閉 GPU 配額
2. **學生管理**
   - 一鍵平均分配 MIG 資源
   - 管理學生 GPU 權限
   - 監控學生使用狀況

### 實驗室功能
1. **專案管理**
   - 創建研究專案
   - 設定專案配額（建立後鎖定）
   - 管理專案成員
2. **實驗排程**
   - 預約 GPU 資源
   - 配額驗證與管控
   - 實驗進度追蹤

## 🛠️ 開發

### API 文檔

後端提供完整的 RESTful API：

#### GPU 管理
- `GET /api/gpu/status` - 獲取 GPU 狀態
- `GET /api/gpu/metrics` - 獲取效能指標
- `POST /api/gpu/mig/create` - 創建 MIG 分區

#### 容器管理
- `GET /api/containers` - 列出容器
- `POST /api/containers` - 創建容器
- `DELETE /api/containers/{id}` - 刪除容器

#### 用戶管理
- `GET /api/users` - 用戶列表
- `POST /api/users` - 創建用戶
- `PUT /api/users/{id}` - 更新用戶

更多 API 詳情請參考 [go-server/README.md](go-server/README.md)

### 前端組件

組件架構：
```
src/components/
├── Admin/          # 管理員專用組件
├── Teacher/        # 教師專用組件
├── Lab/           # 實驗室專用組件
├── Dashboard/     # 儀表板組件
├── Login/         # 登入組件
└── shared/        # 共用組件
```

更多開發資訊請參考 [gpu-ctrl-web/README.md](gpu-ctrl-web/README.md)

## 🐳 Docker 部署

### 使用 Docker Compose

```yaml
version: '3.8'
services:
  gpu-backend:
    build: ./go-server
    ports:
      - "8080:8080"
    environment:
      - SSH_HOSTNAME=${SSH_HOSTNAME}
      - SSH_USERNAME=${SSH_USERNAME}
      - SSH_PASSWORD=${SSH_PASSWORD}
    volumes:
      - ./logs:/app/logs

  gpu-frontend:
    build: ./gpu-ctrl-web
    ports:
      - "3000:80"
    depends_on:
      - gpu-backend
```

```bash
docker-compose up -d
```

## 📊 監控與日誌

### Prometheus 指標
系統暴露以下 Prometheus 指標：
- `gpu_utilization_percent` - GPU 使用率
- `gpu_memory_used_bytes` - GPU 記憶體使用量
- `container_count` - 運行中容器數量
- `mig_partition_count` - MIG 分區數量

### Grafana 儀表板
預設儀表板包含：
- GPU 使用趨勢
- 容器資源消耗
- 用戶活動統計
- 系統效能指標

### 日誌管理
- **應用日誌**: 存儲於 `/var/log/gpu-controller/`
- **操作日誌**: 記錄所有用戶操作
- **錯誤日誌**: 系統錯誤與警告
- **審計日誌**: 安全相關操作記錄

## 🔧 疑難排解

### 常見問題

1. **SSH 連線失敗**
   ```bash
   # 檢查 SSH 設定
   ssh -p 22 username@hostname
   
   # 驗證權限
   ls -la ~/.ssh/
   ```

2. **GPU 檢測失敗**
   ```bash
   # 檢查 NVIDIA 驅動
   nvidia-smi
   
   # 檢查 Docker GPU 支援
   docker run --rm --gpus all nvidia/cuda:11.8-runtime-ubuntu20.04 nvidia-smi
   ```

3. **容器啟動失敗**
   ```bash
   # 檢查 Docker 狀態
   docker info
   
   # 查看容器日誌
   docker logs <container-id>
   ```

4. **前端無法連接後端**
   - 檢查後端服務是否啟動：`curl http://localhost:8080/health`
   - 確認防火牆設定
   - 檢查 CORS 配置

### 效能調優

1. **GPU 資源優化**
   - 啟用 MIG 模式以提高 GPU 利用率
   - 合理設定容器資源限制
   - 定期清理無用映像檔

2. **網路優化**
   - 配置適當的負載平衡
   - 啟用 HTTP/2
   - 使用 CDN 部署靜態資源

## 🤝 貢獻指南

1. Fork 專案儲存庫
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 程式碼規範

- **Go**: 使用 `gofmt` 和 `golint`
- **JavaScript**: 使用 ESLint 和 Prettier
- **提交訊息**: 遵循 Conventional Commits

## 📄 授權條款

本專案採用 MIT 授權條款。詳細內容請參考 [LICENSE](LICENSE) 文件。

## 📞 支援與聯繫

- **Issue 回報**: [GitHub Issues](https://github.com/your-repo/gpu-contrl/issues)
- **功能請求**: [GitHub Discussions](https://github.com/your-repo/gpu-contrl/discussions)
- **技術支援**: contact@yourcompany.com

## 🔄 更新日誌

### v1.0.0 (2024-03-02)
- ✨ 初始版本發布
- 🎯 完整的多角色權限系統
- 💻 GPU 資源監控與管理
- 🎓 教育專用功能
- 🔧 Docker 容器管理
- 📊 監控與日誌系統

---

**Built with ❤️ for GPU Resource Management**
