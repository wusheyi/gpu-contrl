/**
 * 管理員 API 服務
 * 連接 dockerConnecter 後端控制 H200 GPU
 */

import {
  getGpuStatus,
  getMigStatus,
  listContainers,
  stopContainer,
  enableMig,
  partitionMig,
  fullMigSetup,
  cleanupMig,
  shutdownGpu,
  startContainer,
  startContainersBatch
} from './connectorApi';

// ============ 使用者管理 ============

/**
 * 取得所有使用者列表
 * @returns {Promise<Array>} 使用者列表
 */
export const fetchUsers = async () => {
  // TODO: 後端需實作使用者管理 API
  console.log('[Admin API] fetchUsers called');
  return [];
};

/**
 * 新增使用者
 * @param {Object} userData - 使用者資料
 * @param {string} userData.username - 使用者帳號
 * @param {string} userData.email - 電子郵件
 * @param {string} userData.role - 角色 (admin/user)
 * @param {string} userData.password - 密碼
 * @returns {Promise<Object>} 新增結果
 */
export const createUser = async (userData) => {
  console.log('[Admin API] createUser called', userData);
  return { success: true };
};

/**
 * 更新使用者資料
 * @param {string} userId - 使用者 ID
 * @param {Object} userData - 使用者資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateUser = async (userId, userData) => {
  console.log('[Admin API] updateUser called', userId, userData);
  return { success: true };
};

/**
 * 刪除使用者
 * @param {string} userId - 使用者 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteUser = async (userId) => {
  console.log('[Admin API] deleteUser called', userId);
  return { success: true };
};

/**
 * 重設使用者密碼
 * @param {string} userId - 使用者 ID
 * @param {string} newPassword - 新密碼
 * @returns {Promise<Object>} 重設結果
 */
export const resetUserPassword = async (userId, newPassword) => {
  console.log('[Admin API] resetUserPassword called', userId);
  return { success: true };
};

// ============ GPU 資源管理 (連接 dockerConnecter) ============

/**
 * 取得所有 GPU 狀態
 * @returns {Promise<Array>} GPU 列表及狀態
 */
export const fetchGpuStatus = async () => {
  try {
    const [gpuResponse, migResponse] = await Promise.all([
      getGpuStatus(),
      getMigStatus()
    ]);
    
    // 解析 nvidia-smi 輸出並轉換為前端格式
    const migInfo = migResponse.mig_info || {};
    const migModes = migResponse.mig_modes || {};
    
    // 建構 GPU 狀態陣列
    const gpus = Object.entries(migInfo).map(([gpuId, info]) => ({
      id: `gpu-${gpuId}`,
      name: 'NVIDIA H200',
      gpuIndex: parseInt(gpuId),
      migEnabled: migModes[parseInt(gpuId)] || false,
      instances: info.instances || [],
      totalInstances: info.total || 0,
      usedInstances: info.used || 0,
      status: info.instances?.length > 0 ? 'running' : 'idle',
      memory: { total: 81920, used: 0 }, // H200 預設值
      utilization: 0,
      temperature: 45
    }));
    
    return gpus.length > 0 ? gpus : [];
  } catch (error) {
    console.error('[Admin API] fetchGpuStatus error:', error);
    return [];
  }
};

/**
 * 取得 GPU 使用紀錄
 * @param {Object} params - 查詢參數
 * @returns {Promise<Array>} 使用紀錄
 */
export const fetchGpuUsageHistory = async (params) => {
  console.log('[Admin API] fetchGpuUsageHistory called', params);
  return [];
};

/**
 * 強制停止 GPU 任務
 * @param {string} taskId - 任務/容器 ID
 * @returns {Promise<Object>} 停止結果
 */
export const forceStopGpuTask = async (taskId) => {
  try {
    return await stopContainer(taskId);
  } catch (error) {
    console.error('[Admin API] forceStopGpuTask error:', error);
    throw error;
  }
};

// ============ 配額管理 ============

/**
 * 取得使用者配額設定
 * @param {string} userId - 使用者 ID
 * @returns {Promise<Object>} 配額設定
 */
export const fetchUserQuota = async (userId) => {
  // TODO: 呼叫後端 API 取得使用者配額
  // return requestJson(`/api/admin/quotas/${userId}`);
  console.log('[Admin API] fetchUserQuota called', userId);
  return {};
};

/**
 * 更新使用者配額
 * @param {string} userId - 使用者 ID
 * @param {Object} quotaData - 配額資料
 * @param {number} quotaData.gpuLimit - GPU 數量限制
 * @param {number} quotaData.timeLimit - 時間限制（小時）
 * @param {number} quotaData.storageLimit - 儲存空間限制（GB）
 * @returns {Promise<Object>} 更新結果
 */
export const updateUserQuota = async (userId, quotaData) => {
  // TODO: 呼叫後端 API 更新使用者配額
  // return requestJson(`/api/admin/quotas/${userId}`, { method: 'PUT', body: JSON.stringify(quotaData) });
  console.log('[Admin API] updateUserQuota called', userId, quotaData);
  return { success: true };
};

/**
 * 取得預設配額設定
 * @returns {Promise<Object>} 預設配額
 */
export const fetchDefaultQuota = async () => {
  // TODO: 呼叫後端 API 取得預設配額
  // return requestJson('/api/admin/quotas/default');
  console.log('[Admin API] fetchDefaultQuota called');
  return {};
};

/**
 * 更新預設配額設定
 * @param {Object} quotaData - 配額資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateDefaultQuota = async (quotaData) => {
  // TODO: 呼叫後端 API 更新預設配額
  // return requestJson('/api/admin/quotas/default', { method: 'PUT', body: JSON.stringify(quotaData) });
  console.log('[Admin API] updateDefaultQuota called', quotaData);
  return { success: true };
};

// ============ 系統日誌 ============

/**
 * 取得系統日誌
 * @param {Object} params - 查詢參數
 * @param {string} params.level - 日誌等級 (info/warning/error)
 * @param {string} params.startDate - 起始日期
 * @param {string} params.endDate - 結束日期
 * @param {number} params.page - 頁碼
 * @param {number} params.pageSize - 每頁筆數
 * @returns {Promise<Object>} 日誌列表及分頁資訊
 */
/**
 * 取得系統日誌
 * @param {Object} params - 查詢參數
 * @param {string} params.level - 日誌級別 (info/warning/error/all)
 * @param {string} params.search - 搜尋關鍵字
 * @param {string} params.startDate - 起始日期
 * @param {string} params.endDate - 結束日期
 * @param {number} params.page - 頁碼
 * @param {number} params.pageSize - 每頁筆數
 * @returns {Promise<Object>} 日誌列表及分頁資訊
 */
export const fetchSystemLogs = async (params) => {
  console.log('[Admin API] fetchSystemLogs called', params);
  
  try {
    // 使用 Go server 的日誌 API (預設 port 5000)
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    
    // 構建查詢參數
    const queryParams = new URLSearchParams();
    if (params.level && params.level !== 'all') queryParams.append('level', params.level);
    if (params.search) queryParams.append('search', params.search);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    
    const url = `${goServerUrl}/api/logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error(result.error || result.message || '取得日誌失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] fetchSystemLogs error:', error);
    // 如果 Go server 無法連接，返回空資料讓前端使用模擬資料
    return { logs: [], total: 0 };
  }
};

// ============ 監控服務管理 ============

/**
 * 取得監控服務狀態
 * @returns {Promise<Object>} 監控服務狀態
 */
export const fetchMonitoringStatus = async () => {
  console.log('[Admin API] fetchMonitoringStatus called');
  
  try {
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    const url = `${goServerUrl}/api/monitoring/status`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      // 確保回傳的資料包含必要的 containers 陣列
      const data = result.data;
      if (!data.containers || !Array.isArray(data.containers)) {
        // 如果沒有 containers 陣列，提供預設值
        data.containers = [
          { name: "monitoring_grafana_1", port: 3000, status: "unknown" },
          { name: "monitoring_loki_1", port: 3100, status: "unknown" },
          { name: "monitoring_promtail_1", port: null, status: "unknown" }
        ];
      }
      if (!data.overall_status) {
        data.overall_status = "unknown";
      }
      return data;
    } else {
      throw new Error(result.error || result.message || '取得監控狀態失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] fetchMonitoringStatus error:', error);
    // 返回預設狀態
    return {
      containers: [
        { name: "monitoring_grafana_1", port: 3000, status: "unknown" },
        { name: "monitoring_loki_1", port: 3100, status: "unknown" },
        { name: "monitoring_promtail_1", port: null, status: "unknown" }
      ],
      overall_status: "unknown"
    };
  }
};

/**
 * 啟動監控服務
 * @param {Array} services - 要啟動的服務清單 (可選，為空則啟動全部)
 * @returns {Promise<Object>} 啟動結果
 */
export const startMonitoringServices = async (services) => {
  console.log('[Admin API] startMonitoringServices called', services);
  
  try {
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    const url = `${goServerUrl}/api/monitoring/start`;
    
    const requestBody = services ? { services } : {};
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || result.message || '啟動監控服務失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] startMonitoringServices error:', error);
    throw error;
  }
};

/**
 * 啟動完整監控堆疊
 * @returns {Promise<Object>} 啟動結果
 */
export const startMonitoringStack = async () => {
  console.log('[Admin API] startMonitoringStack called');
  
  try {
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    const url = `${goServerUrl}/api/monitoring/start-stack`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || result.message || '啟動監控堆疊失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] startMonitoringStack error:', error);
    throw error;
  }
};

// ============ 日誌傳送管理 ============

/**
 * 傳送日誌到遠端伺服器
 * @param {string} level - 日誌級別 (INFO, ERROR, WARNING)
 * @param {string} message - 日誌內容
 * @param {string} source - 日誌來源 (選填)
 * @param {string} user - 使用者 (選填)
 * @returns {Promise<Object>} 傳送結果
 */
export const sendLogToRemote = async (level, message, source = 'web-frontend', user = 'web-user') => {
  console.log('[Admin API] sendLogToRemote called', { level, message, source, user });
  
  try {
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    const url = `${goServerUrl}/api/logs/send`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: level.toUpperCase(),
        message,
        source,
        user
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || result.message || '傳送日誌失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] sendLogToRemote error:', error);
    throw error;
  }
};

/**
 * 傳送使用者操作日誌
 * @param {string} user - 使用者名稱
 * @param {string} action - 操作類型
 * @param {string} details - 操作詳情
 * @returns {Promise<Object>} 傳送結果
 */
export const sendUserActionLog = async (user, action, details) => {
  console.log('[Admin API] sendUserActionLog called', { user, action, details });
  
  try {
    const goServerUrl = process.env.REACT_APP_GO_SERVER_URL || 'http://localhost:5000';
    const url = `${goServerUrl}/api/logs/user-action`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user,
        action,
        details
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || result.message || '傳送使用者操作日誌失敗');
    }
    
  } catch (error) {
    console.error('[Admin API] sendUserActionLog error:', error);
    throw error;
  }
};

/**
 * 記錄系統操作日誌的便利函數
 * @param {string} action - 操作類型
 * @param {string} details - 操作詳情  
 * @param {string} level - 日誌級別 (預設 INFO)
 */
export const logSystemAction = async (action, details, level = 'INFO') => {
  try {
    await sendLogToRemote(level, `系統操作 - ${action}: ${details}`, 'web-system', 'system');
    console.log(`[Log] ${action}: ${details}`);
  } catch (error) {
    console.warn('Failed to send system log:', error);
  }
};

/**
 * 記錄使用者操作日誌的便利函數
 * @param {string} user - 使用者名稱
 * @param {string} action - 操作類型
 * @param {string} details - 操作詳情
 */
export const logUserAction = async (user, action, details) => {
  try {
    await sendUserActionLog(user, action, details);
    console.log(`[UserLog] ${user} - ${action}: ${details}`);
  } catch (error) {
    console.warn('Failed to send user action log:', error);
  }
};

/**
 * 取得使用者操作日誌
 * @param {string} userId - 使用者 ID
 * @param {Object} params - 查詢參數
 * @returns {Promise<Array>} 操作日誌
 */
export const fetchUserActivityLogs = async (userId, params) => {
  // TODO: 呼叫後端 API 取得使用者操作日誌
  // return requestJson(`/api/admin/logs/user/${userId}`, { method: 'POST', body: JSON.stringify(params) });
  console.log('[Admin API] fetchUserActivityLogs called', userId, params);
  return [];
};

// ============ 系統設定 ============

/**
 * 取得系統設定
 * @returns {Promise<Object>} 系統設定
 */
export const fetchSystemSettings = async () => {
  // TODO: 呼叫後端 API 取得系統設定
  // return requestJson('/api/admin/settings');
  console.log('[Admin API] fetchSystemSettings called');
  return {};
};

/**
 * 更新系統設定
 * @param {Object} settings - 設定資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateSystemSettings = async (settings) => {
  // TODO: 呼叫後端 API 更新系統設定
  // return requestJson('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
  console.log('[Admin API] updateSystemSettings called', settings);
  return { success: true };
};

// ============ 容器管理 ============

/**
 * 取得所有運行中的容器 (連接 dockerConnecter)
 * @returns {Promise<Array>} 容器列表
 */
export const fetchRunningContainers = async () => {
  try {
    const response = await listContainers();
    // 轉換為前端需要的格式
    return (response.containers || []).map(c => ({
      id: c.id,
      name: c.id.substring(0, 12),
      user: 'unknown',
      gpuId: parseGpuFromPort(c.ports),
      startTime: new Date().toISOString(),
      status: c.status?.includes('Up') ? 'running' : 'stopped',
      image: c.image,
      ports: c.ports
    }));
  } catch (error) {
    console.error('[Admin API] fetchRunningContainers error:', error);
    return [];
  }
};

/**
 * 從 port 解析 GPU ID
 */
const parseGpuFromPort = (portsStr) => {
  if (!portsStr) return 'gpu-0';
  const match = portsStr.match(/:(\d+)->/);
  if (match) {
    const port = parseInt(match[1]);
    const gpuId = Math.floor((port - 1) / 10000);
    return `gpu-${gpuId}`;
  }
  return 'gpu-0';
};

/**
 * 強制停止容器 (連接 dockerConnecter)
 * @param {string} containerId - 容器 ID
 * @returns {Promise<Object>} 停止結果
 */
export const forceStopContainer = async (containerId) => {
  try {
    return await stopContainer(containerId);
  } catch (error) {
    console.error('[Admin API] forceStopContainer error:', error);
    throw error;
  }
};

/**
 * 取得容器日誌
 * @param {string} containerId - 容器 ID
 * @param {number} lines - 日誌行數
 * @returns {Promise<string>} 容器日誌
 */
export const fetchContainerLogs = async (containerId, lines = 100) => {
  // TODO: 呼叫後端 API 取得容器日誌
  // return requestJson(`/api/admin/containers/${containerId}/logs?lines=${lines}`);
  console.log('[Admin API] fetchContainerLogs called', containerId, lines);
  return '';
};

// ============ 統計報表 ============

/**
 * 取得系統統計資料
 * @returns {Promise<Object>} 統計資料
 */
export const fetchSystemStats = async () => {
  // TODO: 呼叫後端 API 取得系統統計
  // return requestJson('/api/admin/stats');
  console.log('[Admin API] fetchSystemStats called');
  return {};
};

/**
 * 取得使用統計報表
 * @param {Object} params - 查詢參數
 * @param {string} params.period - 統計週期 (daily/weekly/monthly)
 * @param {string} params.startDate - 起始日期
 * @param {string} params.endDate - 結束日期
 * @returns {Promise<Object>} 使用統計
 */
export const fetchUsageReport = async (params) => {
  // TODO: 呼叫後端 API 取得使用統計報表
  // return requestJson('/api/admin/stats/usage', { method: 'POST', body: JSON.stringify(params) });
  console.log('[Admin API] fetchUsageReport called', params);
  return {};
};

// ============ 任務排程 ============

/**
 * 取得所有任務列表
 * @returns {Promise<Array>} 任務列表
 */
export const fetchJobs = async () => {
  // TODO: 呼叫後端 API 取得任務列表
  // return requestJson('/api/admin/jobs');
  console.log('[Admin API] fetchJobs called');
  return [];
};

/**
 * 新增任務
 * @param {Object} jobData - 任務資料
 * @returns {Promise<Object>} 新增結果
 */
export const createJob = async (jobData) => {
  // TODO: 呼叫後端 API 新增任務
  // return requestJson('/api/admin/jobs', { method: 'POST', body: JSON.stringify(jobData) });
  console.log('[Admin API] createJob called', jobData);
  return { success: true };
};

/**
 * 更新任務
 * @param {string} jobId - 任務 ID
 * @param {Object} jobData - 任務資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateJob = async (jobId, jobData) => {
  // TODO: 呼叫後端 API 更新任務
  // return requestJson(`/api/admin/jobs/${jobId}`, { method: 'PUT', body: JSON.stringify(jobData) });
  console.log('[Admin API] updateJob called', jobId, jobData);
  return { success: true };
};

/**
 * 刪除任務
 * @param {string} jobId - 任務 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteJob = async (jobId) => {
  // TODO: 呼叫後端 API 刪除任務
  // return requestJson(`/api/admin/jobs/${jobId}`, { method: 'DELETE' });
  console.log('[Admin API] deleteJob called', jobId);
  return { success: true };
};

/**
 * 啟動任務
 * @param {string} jobId - 任務 ID
 * @returns {Promise<Object>} 啟動結果
 */
export const startJob = async (jobId) => {
  // TODO: 呼叫後端 API 啟動任務
  // return requestJson(`/api/admin/jobs/${jobId}/start`, { method: 'POST' });
  console.log('[Admin API] startJob called', jobId);
  return { success: true };
};

/**
 * 停止任務
 * @param {string} jobId - 任務 ID
 * @returns {Promise<Object>} 停止結果
 */
export const stopJob = async (jobId) => {
  // TODO: 呼叫後端 API 停止任務
  // return requestJson(`/api/admin/jobs/${jobId}/stop`, { method: 'POST' });
  console.log('[Admin API] stopJob called', jobId);
  return { success: true };
};

/**
 * 取得任務日誌
 * @param {string} jobId - 任務 ID
 * @param {number} lines - 日誌行數
 * @returns {Promise<string>} 任務日誌
 */
export const fetchJobLogs = async (jobId, lines = 100) => {
  // TODO: 呼叫後端 API 取得任務日誌
  // return requestJson(`/api/admin/jobs/${jobId}/logs?lines=${lines}`);
  console.log('[Admin API] fetchJobLogs called', jobId, lines);
  return '';
};

/**
 * 取得任務詳情
 * @param {string} jobId - 任務 ID
 * @returns {Promise<Object>} 任務詳細資料
 */
export const fetchJobDetails = async (jobId) => {
  // TODO: 呼叫後端 API 取得任務詳情
  // return requestJson(`/api/admin/jobs/${jobId}`);
  console.log('[Admin API] fetchJobDetails called', jobId);
  return {};
};

// ============ 資源分配 (MIG/聚合) ============

/**
 * 取得 GPU 資源列表 (連接 dockerConnecter)
 * @returns {Promise<Array>} GPU 資源列表
 */
export const fetchGpuResources = async () => {
  try {
    const response = await getMigStatus();
    const migInfo = response.mig_info || {};
    const migModes = response.mig_modes || {};
    
    return Object.entries(migInfo).map(([gpuId, info]) => ({
      id: `gpu-${gpuId}`,
      name: `GPU ${gpuId}`,
      model: 'NVIDIA H200',
      gpuIndex: parseInt(gpuId),
      migEnabled: migModes[parseInt(gpuId)] || false,
      instances: info.instances || [],
      totalInstances: info.total || 0,
      usedInstances: info.used || 0,
      available: true
    }));
  } catch (error) {
    console.error('[Admin API] fetchGpuResources error:', error);
    return [];
  }
};

/**
 * 建立 MIG 分區 (連接 dockerConnecter)
 * @param {string} gpuId - GPU ID
 * @param {Object} config - MIG 配置
 * @returns {Promise<Object>} 建立結果
 */
export const createMigPartition = async (gpuId, config) => {
  try {
    const gpuIndex = parseInt(gpuId.replace('gpu-', ''));
    const profile = config?.profile || '19,19,19,19,19,19,19';
    return await partitionMig([gpuIndex], profile);
  } catch (error) {
    console.error('[Admin API] createMigPartition error:', error);
    throw error;
  }
};

/**
 * 刪除 MIG 分區 (連接 dockerConnecter)
 * @param {string} gpuId - GPU ID
 * @param {string} migId - MIG 分區 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteMigPartition = async (gpuId, migId) => {
  try {
    const gpuIndex = parseInt(gpuId.replace('gpu-', ''));
    return await shutdownGpu(gpuIndex);
  } catch (error) {
    console.error('[Admin API] deleteMigPartition error:', error);
    throw error;
  }
};

/**
 * 聚合多個 GPU
 * @param {Array<string>} gpuIds - GPU ID 列表
 * @returns {Promise<Object>} 聚合結果
 */
export const aggregateGpus = async (gpuIds) => {
  // TODO: 呼叫後端 API 聚合 GPU
  // return requestJson('/api/admin/resources/aggregate', { method: 'POST', body: JSON.stringify({ gpuIds }) });
  console.log('[Admin API] aggregateGpus called', gpuIds);
  return { success: true };
};

/**
 * 解除 GPU 聚合
 * @param {string} aggregationId - 聚合 ID
 * @returns {Promise<Object>} 解除結果
 */
export const releaseGpuAggregation = async (aggregationId) => {
  // TODO: 呼叫後端 API 解除 GPU 聚合
  // return requestJson(`/api/admin/resources/aggregate/${aggregationId}`, { method: 'DELETE' });
  console.log('[Admin API] releaseGpuAggregation called', aggregationId);
  return { success: true };
};

// ============ 映像檔管理 ============

/**
 * 取得映像檔列表
 * @param {Object} params - 查詢參數
 * @returns {Promise<Array>} 映像檔列表
 */
export const fetchImages = async (params) => {
  // TODO: 呼叫後端 API 取得映像檔列表
  // return requestJson('/api/admin/images', { method: 'POST', body: JSON.stringify(params) });
  console.log('[Admin API] fetchImages called', params);
  return [];
};

/**
 * 拉取映像檔
 * @param {string} imageName - 映像檔完整名稱
 * @returns {Promise<Object>} 拉取結果
 */
export const pullImage = async (imageName) => {
  // TODO: 呼叫後端 API 拉取映像檔
  // return requestJson('/api/admin/images/pull', { method: 'POST', body: JSON.stringify({ imageName }) });
  console.log('[Admin API] pullImage called', imageName);
  return { success: true };
};

/**
 * 刪除映像檔
 * @param {string} imageId - 映像檔 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteImage = async (imageId) => {
  // TODO: 呼叫後端 API 刪除映像檔
  // return requestJson(`/api/admin/images/${imageId}`, { method: 'DELETE' });
  console.log('[Admin API] deleteImage called', imageId);
  return { success: true };
};

/**
 * 推送映像檔
 * @param {string} imageName - 映像檔名稱
 * @param {string} registry - 目標倉庫
 * @returns {Promise<Object>} 推送結果
 */
export const pushImage = async (imageName, registry) => {
  // TODO: 呼叫後端 API 推送映像檔
  // return requestJson('/api/admin/images/push', { method: 'POST', body: JSON.stringify({ imageName, registry }) });
  console.log('[Admin API] pushImage called', imageName, registry);
  return { success: true };
};

/**
 * 取得映像檔標籤列表
 * @param {string} imageName - 映像檔名稱
 * @returns {Promise<Array>} 標籤列表
 */
export const fetchImageTags = async (imageName) => {
  // TODO: 呼叫後端 API 取得標籤列表
  // return requestJson(`/api/admin/images/${imageName}/tags`);
  console.log('[Admin API] fetchImageTags called', imageName);
  return [];
};

/**
 * 搜尋 Docker Hub
 * @param {string} query - 搜尋關鍵字
 * @returns {Promise<Array>} 搜尋結果
 */
export const searchDockerHub = async (query) => {
  // TODO: 呼叫後端 API 搜尋 Docker Hub
  // return requestJson(`/api/admin/images/search?q=${query}`);
  console.log('[Admin API] searchDockerHub called', query);
  return [];
};

// ============ Grafana/Prometheus 整合 ============

/**
 * 取得 Grafana 儀表板列表
 * @returns {Promise<Array>} 儀表板列表
 */
export const fetchGrafanaDashboards = async () => {
  // TODO: 呼叫後端 API 取得 Grafana 儀表板
  // return requestJson('/api/admin/monitoring/dashboards');
  console.log('[Admin API] fetchGrafanaDashboards called');
  return [];
};

/**
 * 取得 Grafana 面板資料
 * @param {string} dashboardId - 儀表板 ID
 * @returns {Promise<Array>} 面板列表
 */
export const fetchGrafanaPanels = async (dashboardId) => {
  // TODO: 呼叫後端 API 取得 Grafana 面板
  // return requestJson(`/api/admin/monitoring/dashboards/${dashboardId}/panels`);
  console.log('[Admin API] fetchGrafanaPanels called', dashboardId);
  return [];
};

/**
 * 取得 Prometheus 指標資料
 * @param {Object} params - 查詢參數
 * @returns {Promise<Object>} 指標資料
 */
export const fetchPrometheusMetrics = async (params) => {
  // TODO: 呼叫後端 API 取得 Prometheus 指標
  // return requestJson('/api/admin/monitoring/metrics', { method: 'POST', body: JSON.stringify(params) });
  console.log('[Admin API] fetchPrometheusMetrics called', params);
  return {};
};

// ============ 教師功能 - 虛擬教室 ============

/**
 * 取得虛擬教室列表
 * @returns {Promise<Array>} 虛擬教室列表
 */
export const fetchVirtualClassrooms = async () => {
  console.log('[Admin API] fetchVirtualClassrooms called');
  return [];
};

/**
 * 建立虛擬教室
 * @param {Object} classroomData - 教室資料
 * @returns {Promise<Object>} 建立結果
 */
export const createVirtualClassroom = async (classroomData) => {
  console.log('[Admin API] createVirtualClassroom called', classroomData);
  return { success: true };
};

/**
 * 更新虛擬教室
 * @param {string} classroomId - 教室 ID
 * @param {Object} classroomData - 教室資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateVirtualClassroom = async (classroomId, classroomData) => {
  console.log('[Admin API] updateVirtualClassroom called', classroomId, classroomData);
  return { success: true };
};

/**
 * 刪除虛擬教室
 * @param {string} classroomId - 教室 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteVirtualClassroom = async (classroomId) => {
  console.log('[Admin API] deleteVirtualClassroom called', classroomId);
  return { success: true };
};

/**
 * 開始上課 (啟動教室)
 * @param {string} classroomId - 教室 ID
 * @returns {Promise<Object>} 啟動結果
 */
export const startClassroom = async (classroomId) => {
  console.log('[Admin API] startClassroom called', classroomId);
  return { success: true };
};

/**
 * 結束上課 (停止教室)
 * @param {string} classroomId - 教室 ID
 * @returns {Promise<Object>} 停止結果
 */
export const stopClassroom = async (classroomId) => {
  console.log('[Admin API] stopClassroom called', classroomId);
  return { success: true };
};

/**
 * 新增學生到教室
 * @param {string} classroomId - 教室 ID
 * @param {string} studentEmail - 學生 Email
 * @returns {Promise<Object>} 新增結果
 */
export const addStudentToClassroom = async (classroomId, studentEmail) => {
  console.log('[Admin API] addStudentToClassroom called', classroomId, studentEmail);
  return { success: true };
};

/**
 * 從教室移除學生
 * @param {string} classroomId - 教室 ID
 * @param {string} studentId - 學生 ID
 * @returns {Promise<Object>} 移除結果
 */
export const removeStudentFromClassroom = async (classroomId, studentId) => {
  console.log('[Admin API] removeStudentFromClassroom called', classroomId, studentId);
  return { success: true };
};

// ============ 教師功能 - 學生 GPU 分配 ============

/**
 * 取得學生 GPU 分配列表
 * @returns {Promise<Array>} 分配列表
 */
export const fetchStudentGpuAllocations = async () => {
  console.log('[Admin API] fetchStudentGpuAllocations called');
  return [];
};

/**
 * 分配 GPU 給學生
 * @param {Object} allocationData - 分配資料
 * @returns {Promise<Object>} 分配結果
 */
export const allocateGpuToStudent = async (allocationData) => {
  console.log('[Admin API] allocateGpuToStudent called', allocationData);
  return { success: true };
};

/**
 * 收回學生的 GPU 分配
 * @param {string} allocationId - 分配 ID
 * @returns {Promise<Object>} 收回結果
 */
export const deallocateGpuFromStudent = async (allocationId) => {
  console.log('[Admin API] deallocateGpuFromStudent called', allocationId);
  return { success: true };
};

/**
 * 取得可用的 MIG 分區列表
 * @returns {Promise<Array>} MIG 分區列表
 */
export const fetchAvailableMigPartitions = async () => {
  console.log('[Admin API] fetchAvailableMigPartitions called');
  return [];
};

/**
 * 自動平均分配 GPU 給教室所有學生
 * @param {string} classroomId - 教室 ID
 * @returns {Promise<Object>} 分配結果
 */
export const autoDistributeGpuToStudents = async (classroomId) => {
  console.log('[Admin API] autoDistributeGpuToStudents called', classroomId);
  // TODO: 呼叫後端 API 自動將可用的 MIG 分區平均分配給指定教室的所有學生
  return { success: true };
};

/**
 * 更新虛擬教室排程設定
 * @param {string} classroomId - 教室 ID
 * @param {Object} scheduleData - 排程設定
 * @param {string} scheduleData.scheduleType - 排程類型 ('once' | 'weekly')
 * @param {Array<number>} scheduleData.weeklyDays - 每週上課日 (0-6, 0=週日)
 * @param {string} scheduleData.dailyStartTime - 每日開始時間 (HH:mm)
 * @param {string} scheduleData.dailyEndTime - 每日結束時間 (HH:mm)
 * @param {boolean} scheduleData.autoActivate - 是否自動開啟配額
 * @returns {Promise<Object>} 更新結果
 */
export const updateClassroomSchedule = async (classroomId, scheduleData) => {
  console.log('[Admin API] updateClassroomSchedule called', classroomId, scheduleData);
  // TODO: 呼叫後端 API 更新教室排程
  // 後端需實作排程服務，在指定時段自動開啟/關閉教室的 GPU 配額
  return { success: true };
};

// ============ 實驗室功能 - 專案管理 ============

/**
 * 取得專案列表
 * @returns {Promise<Array>} 專案列表
 */
export const fetchProjects = async () => {
  console.log('[Admin API] fetchProjects called');
  return [];
};

/**
 * 建立專案
 * @param {Object} projectData - 專案資料
 * @returns {Promise<Object>} 建立結果
 */
export const createProject = async (projectData) => {
  console.log('[Admin API] createProject called', projectData);
  return { success: true };
};

/**
 * 更新專案
 * @param {string} projectId - 專案 ID
 * @param {Object} projectData - 專案資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateProject = async (projectId, projectData) => {
  console.log('[Admin API] updateProject called', projectId, projectData);
  return { success: true };
};

/**
 * 刪除專案
 * @param {string} projectId - 專案 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteProject = async (projectId) => {
  console.log('[Admin API] deleteProject called', projectId);
  return { success: true };
};

/**
 * 新增專案成員
 * @param {string} projectId - 專案 ID
 * @param {string} memberEmail - 成員 Email
 * @returns {Promise<Object>} 新增結果
 */
export const addProjectMember = async (projectId, memberEmail) => {
  console.log('[Admin API] addProjectMember called', projectId, memberEmail);
  return { success: true };
};

/**
 * 移除專案成員
 * @param {string} projectId - 專案 ID
 * @param {string} memberId - 成員 ID
 * @returns {Promise<Object>} 移除結果
 */
export const removeProjectMember = async (projectId, memberId) => {
  console.log('[Admin API] removeProjectMember called', projectId, memberId);
  return { success: true };
};

// ============ 實驗室功能 - 實驗排程 ============

/**
 * 取得實驗列表
 * @returns {Promise<Array>} 實驗列表
 */
export const fetchExperiments = async () => {
  console.log('[Admin API] fetchExperiments called');
  return [];
};

/**
 * 建立實驗
 * @param {Object} experimentData - 實驗資料
 * @returns {Promise<Object>} 建立結果
 */
export const createExperiment = async (experimentData) => {
  console.log('[Admin API] createExperiment called', experimentData);
  return { success: true };
};

/**
 * 更新實驗
 * @param {string} experimentId - 實驗 ID
 * @param {Object} experimentData - 實驗資料
 * @returns {Promise<Object>} 更新結果
 */
export const updateExperiment = async (experimentId, experimentData) => {
  console.log('[Admin API] updateExperiment called', experimentId, experimentData);
  return { success: true };
};

/**
 * 刪除實驗
 * @param {string} experimentId - 實驗 ID
 * @returns {Promise<Object>} 刪除結果
 */
export const deleteExperiment = async (experimentId) => {
  console.log('[Admin API] deleteExperiment called', experimentId);
  return { success: true };
};

/**
 * 開始實驗
 * @param {string} experimentId - 實驗 ID
 * @returns {Promise<Object>} 啟動結果
 */
export const startExperiment = async (experimentId) => {
  console.log('[Admin API] startExperiment called', experimentId);
  return { success: true };
};

/**
 * 停止實驗
 * @param {string} experimentId - 實驗 ID
 * @returns {Promise<Object>} 停止結果
 */
export const stopExperiment = async (experimentId) => {
  console.log('[Admin API] stopExperiment called', experimentId);
  return { success: true };
};

/**
 * 取得實驗日誌
 * @param {string} experimentId - 實驗 ID
 * @returns {Promise<string>} 實驗日誌
 */
export const fetchExperimentLogs = async (experimentId) => {
  console.log('[Admin API] fetchExperimentLogs called', experimentId);
  return '';
};
