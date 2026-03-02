/**
 * Docker Connector API 服務
 * 用於連接 dockerConnecter 後端控制 H200 GPU
 */

// 預設後端地址（dockerConnecter Flask 伺服器）
const DEFAULT_BASE_URL = 'http://localhost:5000';

const getBaseUrl = () => {
  return process.env.REACT_APP_CONNECTOR_BASE_URL || DEFAULT_BASE_URL;
};

/**
 * 通用 JSON 請求函式
 */
const requestJson = async (path, options = {}) => {
  const { method = 'POST', body, ...restOptions } = options;
  
  const fetchOptions = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...restOptions
  };

  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(`${getBaseUrl()}${path}`, fetchOptions);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const errorMessage = data.error || data.message || '連線失敗';
    throw new Error(errorMessage);
  }

  return data;
};

// ============ SSH 連線管理 ============

/**
 * 建立 SSH 連線
 */
export const connect = (hostname, username, password) => 
  requestJson('/api/connect', { body: { hostname, username, password } });

/**
 * 斷開 SSH 連線
 */
export const disconnect = () => requestJson('/api/disconnect');

/**
 * 檢查連線狀態
 */
export const getConnectionStatus = () => requestJson('/api/status', { method: 'GET' });

// ============ GPU 狀態 ============

/**
 * 取得 GPU 狀態
 */
export const getGpuStatus = () => requestJson('/api/gpu/status', { method: 'GET' });

/**
 * 取得 GPU 詳細指標（使用率、記憶體、溫度、功耗）
 */
export const getGpuMetrics = () => requestJson('/api/gpu/metrics', { method: 'GET' });

/**
 * 取得 MIG 分割狀態
 */
export const getMigStatus = () => requestJson('/api/mig/status', { method: 'GET' });

// ============ MIG 管理 ============

/**
 * 開啟 MIG 權限
 * @param {Array<number>} gpuIds - GPU ID 陣列
 */
export const enableMig = (gpuIds = [0, 1, 2, 3]) => 
  requestJson('/api/mig/enable', { body: { gpu_ids: gpuIds } });

/**
 * MIG 分割
 * @param {Array<number>} gpuIds - GPU ID 陣列
 * @param {string} profile - MIG profile (預設 7 個 1g.10gb)
 */
export const partitionMig = (gpuIds = [0, 1, 2, 3], profile = '19,19,19,19,19,19,19') => 
  requestJson('/api/mig/partition', { body: { gpu_ids: gpuIds, profile } });

/**
 * 完整 MIG 設定（開啟權限 + 分割）
 * @param {Array<number>} gpuIds - GPU ID 陣列
 */
export const fullMigSetup = (gpuIds = [0, 1, 2, 3]) => 
  requestJson('/api/mig/full-setup', { body: { gpu_ids: gpuIds } });

/**
 * 清理 MIG 設定
 */
export const cleanupMig = () => requestJson('/api/mig/cleanup');

/**
 * 刪除單一 MIG 實例
 * @param {number} gpuId - GPU ID
 * @param {number} giId - GPU Instance ID
 */
export const deleteMigInstance = (gpuId, giId) => 
  requestJson('/api/mig/delete-instance', { body: { gpu_id: gpuId, gi_id: giId } });

// ============ 容器管理 ============

/**
 * 啟動 Docker 容器
 * @param {number} deviceId - GPU ID
 * @param {number} nums - 容器數量
 * @param {string} image - Docker 映像檔
 */
export const startContainer = (deviceId = 0, nums = 1, image = 'ssh-nvidia:latest') => 
  requestJson('/api/container/start', { body: { device_id: deviceId, nums, image } });

/**
 * 批次啟動多個 GPU 的 Docker 容器
 * @param {Array} gpuConfigs - GPU 配置陣列 [{device_id, nums}]
 * @param {string} image - Docker 映像檔
 */
export const startContainersBatch = (gpuConfigs, image = 'ssh-nvidia:latest') => 
  requestJson('/api/container/start-batch', { body: { gpu_configs: gpuConfigs, image } });

/**
 * 列出所有容器
 */
export const listContainers = () => requestJson('/api/container/list', { method: 'GET' });

/**
 * 取得容器對應的 port 資訊
 */
export const getContainerPorts = () => requestJson('/api/container/ports', { method: 'GET' });

/**
 * 停止單一容器
 * @param {string} containerId - 容器 ID
 */
export const stopContainer = (containerId) => 
  requestJson('/api/container/stop', { body: { container_id: containerId } });

/**
 * 批次停止多個容器
 * @param {Array<string>} containerIds - 容器 ID 陣列
 */
export const stopContainersBatch = (containerIds) => 
  requestJson('/api/container/stop-batch', { body: { container_ids: containerIds } });

/**
 * 停止所有容器
 */
export const stopAllContainers = () => requestJson('/api/container/stop-all', { body: {} });

// ============ GPU 關閉操作 ============

/**
 * 關閉特定 GPU 的所有資源
 * @param {number} gpuId - GPU ID
 */
export const shutdownGpu = (gpuId) => 
  requestJson('/api/gpu/shutdown', { body: { gpu_id: gpuId } });

// ============ Docker Images 管理 ============

/**
 * 取得所有 Docker images
 */
export const getImagesList = () => requestJson('/api/images/list', { method: 'GET' });

/**
 * 拉取 Docker image
 * @param {string} imageName - 完整映像檔名稱 (含 tag)
 */
export const pullDockerImage = (imageName) => 
  requestJson('/api/images/pull', { body: { image_name: imageName } });

/**
 * 刪除 Docker image
 * @param {string} imageId - 映像檔 ID
 * @param {boolean} force - 是否強制刪除
 */
export const deleteDockerImage = (imageId, force = false) => 
  requestJson('/api/images/delete', { body: { image_id: imageId, force } });

/**
 * 查看 Docker image 詳細資訊
 * @param {string} imageId - 映像檔 ID
 */
export const inspectDockerImage = (imageId) => 
  requestJson(`/api/images/inspect?image_id=${imageId}`, { method: 'GET' });

/**
 * 為 Docker image 新增標籤
 * @param {string} sourceImage - 來源映像檔
 * @param {string} targetImage - 目標映像檔名稱
 */
export const tagDockerImage = (sourceImage, targetImage) => 
  requestJson('/api/images/tag', { body: { source_image: sourceImage, target_image: targetImage } });

// ============ 相容性別名（舊版 API）============

/**
 * 啟動 Ubuntu 容器（相容舊版）
 */
export const startUbuntu = async () => {
  const result = await startContainer(0, 1, 'ssh-nvidia:latest');
  const port = result.ports?.[0] || 10001;
  return {
    ...result,
    ssh_info: `ssh root@10.133.77.231 -p ${port}<br>密碼：123456`,
    logs: [`容器已啟動，Port: ${port}`]
  };
};

/**
 * 停止 Ubuntu 容器（相容舊版）
 */
export const stopUbuntu = async () => {
  const containers = await listContainers();
  if (containers.containers?.length > 0) {
    const result = await stopContainer(containers.containers[0].id);
    return { ...result, logs: ['容器已停止'] };
  }
  return { success: true, message: '沒有運行中的容器', logs: [] };
};

/**
 * 啟動 Jupyter（相容舊版）
 */
export const startJupyter = async () => {
  const result = await startContainer(0, 1, 'jupyter-nvidia:latest');
  const port = result.ports?.[0] || 10001;
  return {
    ...result,
    url: `http://10.133.77.231:${port + 8000}`,
    logs: [`Jupyter 已啟動，Port: ${port + 8000}`]
  };
};

/**
 * 停止 Jupyter（相容舊版）
 */
export const stopJupyter = async () => {
  const containers = await listContainers();
  const jupyterContainer = containers.containers?.find(c => c.image.includes('jupyter'));
  if (jupyterContainer) {
    const result = await stopContainer(jupyterContainer.id);
    return { ...result, logs: ['Jupyter 已停止'] };
  }
  return { success: true, message: '沒有運行中的 Jupyter', logs: [] };
};
