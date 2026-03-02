# GPU Control Panel

一個基於 React 的 GPU 資源管理控制面板網頁應用程式，提供直觀易用的界面來管理 GPU 資源、監控系統狀態和協調多用戶環境下的資源分配。

## 🎯 功能特色

### 🔐 身份認證與權限管理
- **安全登入** - 基於角色的認證系統 (Role-Based Access Control)
- **多角色支援** - 管理員、教師、實驗室、一般用戶
- **權限隔離** - 每個角色只能存取對應的功能模組

### 💻 核心功能
- **🔗 SSH 連線** - 一鍵獲取 SSH 連線指令與密碼（安全彈出視窗）
- **📓 Jupyter Notebook** - 快速啟動 Jupyter 開發環境
- **📊 即時監控** - GPU 使用狀態與效能指標即時顯示
- **🎛️ 資源管理** - 直觀的資源分配與配額管理
- **📈 數據視覺化** - 豐富的圖表與統計報表

### 👨‍🏫 教師控制台
#### 虛擬教室管理
- **課程環境** - 一鍵建立完整的教學 GPU 環境
- **週期性排程** - 智能排課系統，支援每週固定時段
- **自動化流程** - 系統自動在上課時間開啟/關閉 GPU 配額
- **學生管理** - 便捷的學生名單與權限管理

#### 智能資源分配
- **MIG 自動分配** - 一鍵將 MIG 分區平均分配給所有學生
- **資源監控** - 即時查看學生 GPU 使用狀況
- **使用分析** - 學生資源使用統計與分析報表

### 🔬 實驗室控制台
#### 專案生命週期管理
- **專案創建** - 建立研究專案，設定成員與資源配額
- **配額鎖定機制** - 專案建立後配額無法變更，確保資源穩定性
- **成員協作** - 專案成員管理與權限分配
- **進度追蹤** - 專案進度與資源使用追蹤

#### 實驗排程系統
- **智能排程** - 在專案配額範圍內進行實驗資源預約
- **配額驗證** - 自動驗證 GPU 數量與儲存空間限制
- **衝突檢測** - 智能檢測資源衝突並提供解決方案
- **歷史記錄** - 完整的實驗排程與執行歷史

### 👨‍💼 管理員控制台
#### 系統管理
- **使用者管理** - 完整的用戶生命週期管理（新增、編輯、刪除）
- **權限控制** - 細粒度的權限分配與管理
- **配額管理** - 全局與個人配額設定

#### 資源管理
- **GPU 監控** - 全系統 GPU 狀態即時監控
- **MIG 管理** - MIG 分區的創建、刪除與重新配置
- **GPU 聚合** - 多 GPU 聚合管理，最大化資源利用率
- **任務排程** - 全局 GPU 計算任務的智能排程與執行管理

#### 容器與映像管理
- **映像檔管理** - Docker Hub / Harbor 映像檔的完整管理
- **容器編排** - 容器的創建、監控與生命週期管理
- **版本控制** - 映像檔版本管理與回滾機制

#### 監控與分析
- **Grafana 整合** - Prometheus 數據存儲 + Grafana 可視化儀表板
- **效能分析** - 深入的系統效能分析與最佳化建議
- **系統日誌** - 完整的操作記錄與審計日誌
- **報表生成** - 自動化的使用統計與資源配置報表

## 🔑 預設帳號

> ⚠️ **安全提醒**: 生產環境請務必修改預設密碼！

| 角色 | 帳號 | 密碼 | 權限範圍 |
|------|------|------|----------|
| **一般使用者** | `demo_user` | `demo_user` | 基本資源使用 |
| **教師** | `teacher` | `teacher` | 虛擬教室 + 學生管理 |
| **實驗室** | `lab` | `lab` | 專案管理 + 實驗排程 |
| **管理員** | `admin` | `admin` | 完整系統管理權限 |

## 🏗️ 專案架構

```
gpu-ctrl-web/
├── public/
│   ├── index.html              # 主 HTML 模板
│   ├── favicon.ico            # 網站圖標
│   └── manifest.json          # PWA 配置
├── src/
│   ├── components/            # React 組件
│   │   ├── Admin/            # 🛡️ 管理員專用組件
│   │   │   ├── index.js            # 組件出口匯出
│   │   │   ├── AdminPanel.jsx      # 📊 管理員主儀表板
│   │   │   ├── UserManagement.jsx  # 👥 使用者管理模組
│   │   │   ├── GpuMonitor.jsx      # 📈 GPU 即時監控
│   │   │   ├── QuotaManagement.jsx # 💾 配額管理系統
│   │   │   ├── JobScheduling.jsx   # ⏰ 任務排程管理
│   │   │   ├── ResourceAllocation.jsx # 🎛️ 資源分配 (MIG/聚合)
│   │   │   ├── ImageManagement.jsx # 🐳 Docker 映像管理
│   │   │   ├── GrafanaMonitor.jsx  # 📈 Grafana 監控整合
│   │   │   ├── SystemLogs.jsx      # 📝 系統日誌查看器
│   │   │   ├── H200Control.jsx     # 🔧 H200 GPU 專用控制
│   │   │   ├── ClassroomScheduleView.jsx # 📅 教室排程視圖
│   │   │   └── LoggingExamples.jsx # 📋 日誌範例與查詢
│   │   ├── Teacher/          # 👨‍🏫 教師專用組件  
│   │   │   ├── index.js            # 組件出口匯出
│   │   │   ├── TeacherPanel.jsx    # 👩‍🏫 教師主控制台
│   │   │   ├── VirtualClassroom.jsx # 🎓 虛擬教室管理
│   │   │   └── StudentGpuAllocation.jsx # 🎯 學生 GPU 分配
│   │   ├── Lab/              # 🔬 實驗室專用組件
│   │   │   ├── index.js            # 組件出口匯出
│   │   │   ├── LabPanel.jsx        # 🧪 實驗室主控制台
│   │   │   ├── ProjectManagement.jsx # 📁 專案管理系統
│   │   │   └── ExperimentScheduling.jsx # ⏱️ 實驗排程系統
│   │   ├── ProjectManage/    # 📂 專案管理組件
│   │   │   ├── ProjectManage.jsx   # 📋 專案總覽
│   │   │   └── ProjectDetail.jsx   # 🔍 專案詳細資訊
│   │   ├── Dashboard/        # 📊 儀表板組件
│   │   │   └── Dashboard.jsx       # 📈 主儀表板
│   │   ├── Home/             # 🏠 首頁組件
│   │   │   └── Home.jsx            # 🏡 主頁面
│   │   ├── Login/            # 🔐 登入組件
│   │   │   └── Login.jsx           # 🔑 登入頁面
│   │   └── DemoTest/         # 🧪 測試組件
│   │       └── DemoTest.jsx        # 🎮 功能演示
│   ├── services/             # 📡 API 服務層
│   │   ├── connectorApi.js         # 🔗 後端連接器 API
│   │   └── adminApi.js             # ⚙️ 管理員 API 服務
│   ├── types/                # 📝 TypeScript 類型定義
│   │   └── index.ts               # 🏷️ 主要類型定義
│   ├── assets/               # 🎨 靜態資源
│   │   ├── images/               # 🖼️ 圖片資源
│   │   └── icons/                # 🎯 圖標資源
│   ├── styles/               # 💅 樣式文件
│   │   └── global.css            # 🎨 全局 CSS 樣式
│   ├── App.jsx               # 🚀 主應用組件
│   └── index.jsx             # 🏁 應用入口點
├── package.json              # 📦 專案依賴配置
├── staticwebapp.config.json  # ☁️ Azure 靜態網頁配置
├── swa-cli.config.json      # 🛠️ SWA CLI 配置
└── README.md                # 📚 專案說明文件
```

## 🛠️ 技術棧

### 前端框架
- **React 18.2.0** - 現代化的組件式前端框架
- **React Router DOM 6.22.3** - 單頁應用路由管理
- **React Hooks** - 狀態管理與生命週期控制

### UI 組件庫
- **Material UI 6.5.0** - Google Material Design 組件庫
- **@mui/icons-material** - Material Design 圖標庫
- **@emotion/react & @emotion/styled** - CSS-in-JS 樣式方案

### 開發工具
- **Create React App 5.0.1** - React 應用腳手架
- **React Scripts** - 建構與開發工具鏈
- **ESLint** - 程式碼品質檢查
- **Prettier** - 程式碼自動格式化

### 雲端部署
- **Azure Static Web Apps** - 靜態網頁託管服務
- **SWA CLI** - 本地開發與部署工具

## 🚀 快速開始

### 系統需求
- **Node.js** 18.0+ 
- **npm** 8.0+ 或 **yarn** 1.22+
- **現代瀏覽器** (Chrome 90+, Firefox 88+, Safari 14+)

### 1. 開發環境設定

```bash
# 克隆專案
git clone <repository-url>
cd gpu-contrl/gpu-ctrl-web

# 安裝依賴
npm install

# 或使用 yarn
yarn install
```

### 2. 環境配置

建立 `.env.local` 文件（可選）：
```env
# API 端點配置
REACT_APP_API_BASE_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080/ws

# 功能開關
REACT_APP_ENABLE_DEV_MODE=true
REACT_APP_ENABLE_MOCK_DATA=false

# 監控配置
REACT_APP_GRAFANA_URL=http://localhost:3001
REACT_APP_PROMETHEUS_URL=http://localhost:9090
```

### 3. 啟動開發服務器

```bash
# 開發模式啟動
npm start

# 或使用 yarn
yarn start
```

應用程式將在 http://localhost:3000 啟動，並自動開啟瀏覽器。

### 4. 建構生產版本

```bash
# 建構最佳化版本
npm run build

# 預覽建構結果
npx serve -s build
```

## 💻 開發指南

### 組件開發規範

1. **函數式組件優先**
```jsx
import React from 'react';
import { Box, Typography } from '@mui/material';

const MyComponent = ({ title, children }) => {
  return (
    <Box>
      <Typography variant="h5">{title}</Typography>
      {children}
    </Box>
  );
};

export default MyComponent;
```

2. **使用 Material UI 主題**
```jsx
import { useTheme } from '@mui/material/styles';

const ThemedComponent = () => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      backgroundColor: theme.palette.primary.main,
      padding: theme.spacing(2)
    }}>
      Content
    </Box>
  );
};
```

3. **API 服務整合**
```jsx
import { useEffect, useState } from 'react';
import * as adminApi from '../../services/adminApi';

const DataComponent = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await adminApi.fetchUsers();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return loading ? <div>Loading...</div> : <div>{/* render data */}</div>;
};
```

### 路由保護

```jsx
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole, userRole }) => {
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && userRole !== requiredRole && userRole !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};
```

### 狀態管理

```jsx
import { createContext, useContext, useReducer } from 'react';

const AppContext = createContext();

const initialState = {
  user: null,
  gpuData: [],
  theme: 'light'
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'UPDATE_GPU_DATA':
      return { ...state, gpuData: action.payload };
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
```

## 📡 API 整合說明

### 管理員 API 服務

位於 `src/services/adminApi.js`，提供完整的後端 API 整合：

### 管理員 API 服務

位於 `src/services/adminApi.js`，提供完整的後端 API 整合：

#### 🔐 用戶管理 API
```javascript
// 獲取所有用戶
const users = await adminApi.fetchUsers();

// 創建新用戶
await adminApi.createUser({
  username: 'newuser',
  email: 'user@example.com',
  role: 'user',
  password: 'securepassword'
});

// 更新用戶資料
await adminApi.updateUser(userId, { 
  email: 'newemail@example.com',
  role: 'teacher' 
});

// 刪除用戶
await adminApi.deleteUser(userId);

// 重設密碼
await adminApi.resetUserPassword(userId, 'newpassword');
```

#### 🖥️ GPU 資源管理 API
```javascript
// 獲取 GPU 狀態
const gpuStatus = await adminApi.fetchGpuStatus();

// 獲取 GPU 使用歷史
const usage = await adminApi.fetchGpuUsageHistory({
  startDate: '2024-03-01',
  endDate: '2024-03-31',
  gpuId: 0
});

// 強制停止 GPU 任務
await adminApi.forceStopGpuTask(taskId);
```

#### 💾 配額管理 API
```javascript
// 獲取用戶配額
const quota = await adminApi.fetchUserQuota(userId);

// 更新用戶配額
await adminApi.updateUserQuota(userId, {
  gpuHours: 100,
  storageGB: 500,
  maxGpus: 2
});

// 獲取與更新預設配額
const defaultQuota = await adminApi.fetchDefaultQuota();
await adminApi.updateDefaultQuota(newDefaults);
```

#### 📝 系統日誌 API
```javascript
// 獲取系統日誌
const logs = await adminApi.fetchSystemLogs({
  level: 'ERROR',
  startTime: '2024-03-01T00:00:00Z',
  limit: 100
});

// 獲取用戶操作日誌
const userLogs = await adminApi.fetchUserActivityLogs(userId, {
  action: 'LOGIN',
  limit: 50
});
```

#### 🐳 容器管理 API
```javascript
// 獲取運行中容器
const containers = await adminApi.fetchRunningContainers();

// 強制停止容器
await adminApi.forceStopContainer(containerId);

// 獲取容器日誌
const logs = await adminApi.fetchContainerLogs(containerId, 100);
```

#### 📊 統計報表 API
```javascript
// 系統統計
const stats = await adminApi.fetchSystemStats();

// 使用報表
const report = await adminApi.fetchUsageReport({
  period: 'monthly',
  year: 2024,
  month: 3
});
```

#### ⏰ 任務排程 API
```javascript
// 任務管理
const jobs = await adminApi.fetchJobs();
await adminApi.createJob({
  name: 'Training Job',
  image: 'tensorflow/tensorflow:latest-gpu',
  gpuCount: 2,
  schedule: '0 2 * * *'  // 每日凌晨2點
});
await adminApi.startJob(jobId);
await adminApi.stopJob(jobId);
```

#### 🎛️ 資源分配 API
```javascript
// MIG 管理
const resources = await adminApi.fetchGpuResources();
await adminApi.createMigPartition(gpuId, {
  profile: '1g.5gb',
  count: 4
});
await adminApi.deleteMigPartition(gpuId, migId);

// GPU 聚合
await adminApi.aggregateGpus([0, 1, 2, 3]);
await adminApi.releaseGpuAggregation(aggregationId);
```

#### 👨‍🏫 教師功能 API
```javascript
// 虛擬教室管理
const classrooms = await adminApi.fetchVirtualClassrooms();
await adminApi.createVirtualClassroom({
  name: '深度學習課程',
  studentEmails: ['student1@email.com', 'student2@email.com'],
  gpuQuota: 2,
  schedule: {
    dayOfWeek: [1, 3, 5],  // 週一、三、五
    startTime: '14:00',
    endTime: '16:00'
  }
});

// 學生 GPU 分配
await adminApi.autoDistributeGpuToStudents(classroomId);
const allocations = await adminApi.fetchStudentGpuAllocations();
```

#### 🐳 映像檔管理 API
```javascript
// 映像檔操作
const images = await adminApi.fetchImages({ 
  registry: 'dockerhub',
  search: 'tensorflow' 
});
await adminApi.pullImage('tensorflow/tensorflow:latest-gpu');
await adminApi.deleteImage(imageId);

// Docker Hub 搜尋
const results = await adminApi.searchDockerHub('pytorch');
```

#### 📈 監控整合 API
```javascript
// Grafana 整合
const dashboards = await adminApi.fetchGrafanaDashboards();
const panels = await adminApi.fetchGrafanaPanels(dashboardId);

// Prometheus 指標
const metrics = await adminApi.fetchPrometheusMetrics({
  query: 'gpu_utilization_percent',
  start: '2024-03-01T00:00:00Z',
  end: '2024-03-01T23:59:59Z'
});
```

### 連接器 API 服務

位於 `src/services/connectorApi.js`，處理基本的後端連接：

```javascript
// SSH 連線測試
const connection = await connectorApi.testConnection();

// 執行遠端命令
const result = await connectorApi.executeCommand('nvidia-smi');

// 獲取系統資訊
const systemInfo = await connectorApi.getSystemInfo();
```

## 🎨 主題與樣式

### Material UI 主題配置

```javascript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // 或 'dark'
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036'
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8
        }
      }
    }
  }
});
```

### 響應式設計

```jsx
import { useTheme, useMediaQuery } from '@mui/material';

const ResponsiveComponent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 2
    }}>
      {/* 內容 */}
    </Box>
  );
};
```

## 🧪 測試

### 單元測試
```bash
# 執行測試
npm test

# 執行測試並產生覆蓋率報告
npm test -- --coverage

# 監聽模式
npm test -- --watch
```

### 測試範例
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';

test('renders login form', () => {
  render(<Login />);
  const usernameInput = screen.getByLabelText(/username/i);
  const passwordInput = screen.getByLabelText(/password/i);
  const loginButton = screen.getByRole('button', { name: /login/i });
  
  expect(usernameInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(loginButton).toBeInTheDocument();
});

test('submits login form', () => {
  const mockLogin = jest.fn();
  render(<Login onLogin={mockLogin} />);
  
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: 'testuser' }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password' }
  });
  fireEvent.click(screen.getByRole('button', { name: /login/i }));
  
  expect(mockLogin).toHaveBeenCalledWith('testuser', 'password');
});
```

## 🚀 部署

### 本地建構
```bash
# 最佳化建構
npm run build

# 分析 bundle 大小
npx source-map-explorer 'build/static/js/*.js'
```

### Azure Static Web Apps 部署

1. **設定 GitHub Actions**
```yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [ main ]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [ main ]

jobs:
  build_and_deploy_job:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
      with:
        submodules: true
    - name: Build And Deploy
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/"
        api_location: ""
        output_location: "build"
```

2. **配置 staticwebapp.config.json**
```json
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "http://your-backend-api.com/api/*"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*"]
  },
  "globalHeaders": {
    "cache-control": "must-revalidate, max-age=6000"
  }
}
```

### Docker 部署

```dockerfile
# 多階段建構 Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx 配置
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://gpu-controller-backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📈 效能最佳化

### Bundle 分析與最佳化
```bash
# 分析 bundle 大小
npm install --save-dev webpack-bundle-analyzer
npm run build
npx webpack-bundle-analyzer build/static/js/*.js

# 使用 React.lazy 進行代碼分割
const AdminPanel = React.lazy(() => import('./components/Admin/AdminPanel'));
const TeacherPanel = React.lazy(() => import('./components/Teacher/TeacherPanel'));
```

### 效能監控
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// 監控核心 Web Vitals
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🔧 疑難排解

### 常見問題

1. **API 連線問題**
```javascript
// 檢查網路連線
if (!navigator.onLine) {
  console.error('網路連線中斷');
  return;
}

// 使用 axios interceptor 處理錯誤
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 重新導向到登入頁
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

2. **記憶體洩漏預防**
```javascript
useEffect(() => {
  let isMounted = true;
  
  const fetchData = async () => {
    const data = await api.getData();
    if (isMounted) {
      setData(data);
    }
  };
  
  fetchData();
  
  return () => {
    isMounted = false;
  };
}, []);
```

3. **圖表渲染問題**
```javascript
// 使用 ResizeObserver 處理圖表響應式
useEffect(() => {
  const resizeObserver = new ResizeObserver(entries => {
    if (chartRef.current) {
      chartRef.current.resize();
    }
  });
  
  if (containerRef.current) {
    resizeObserver.observe(containerRef.current);
  }
  
  return () => resizeObserver.disconnect();
}, []);
```

## 📚 學習資源

### 官方文檔
- [React 官方文檔](https://reactjs.org/docs/)
- [Material UI 文檔](https://mui.com/)
- [React Router 文檔](https://reactrouter.com/)

### 最佳實踐
- [React 最佳實踐](https://react.dev/learn/thinking-in-react)
- [JavaScript Clean Code](https://github.com/ryanmcdermott/clean-code-javascript)
- [Material Design Guidelines](https://material.io/design)

## 🤝 貢獻指南

1. **Fork 專案** 並創建功能分支
```bash
git checkout -b feature/新功能名稱
```

2. **遵循程式碼規範**
```bash
# 檢查程式碼風格
npm run lint

# 自動修復風格問題
npm run lint:fix

# 格式化程式碼
npm run format
```

3. **撰寫測試**
```bash
# 新功能必須包含測試
npm test -- --coverage
```

4. **提交變更**
```bash
git commit -m "feat: 新增某某功能"
git push origin feature/新功能名稱
```

## 📄 授權條款

本專案採用 MIT 授權條款。詳見 [LICENSE](../LICENSE) 文件。

---

**Built with React & Material UI for Modern GPU Resource Management**

## 技術棧

- **React 18** - 前端框架
- **TypeScript** - 類型安全
- **CSS3** - 樣式設計（漸層背景、毛玻璃效果）

## 後續擴展

SSH 和 Jupyter 按鈕目前為空函數，可以在以下位置進行擴展：

- `src/components/Dashboard/Dashboard.tsx`
  - `handleSSHConnect()` - SSH 連線邏輯
  - `handleJupyterConnect()` - Jupyter 連線邏輯
