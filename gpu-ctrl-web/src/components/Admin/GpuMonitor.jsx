import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';
import StopIcon from '@mui/icons-material/Stop';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CircularProgress from '@mui/material/CircularProgress';

import {
  getConnectionStatus,
  connect,
  disconnect,
  getMigStatus,
  getGpuMetrics,
  listContainers,
  startContainer,
  stopContainer,
  stopAllContainers,
  getImagesList
} from '../../services/connectorApi';

const GpuMonitor = () => {
  const [gpus, setGpus] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerLogs, setContainerLogs] = useState('');
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hostname, setHostname] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // 容器啟動設定
  const [containerConfig, setContainerConfig] = useState({
    deviceId: 0,
    nums: 1,
    image: 'ssh-nvidia:latest'
  });
  const [availableImages, setAvailableImages] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 檢查連線狀態
      const statusRes = await getConnectionStatus();
      setIsConnected(statusRes.connected);
      setHostname(statusRes.hostname || '');
      
      if (statusRes.connected) {
        // 載入可用映像檔
        try {
          const imagesRes = await getImagesList();
          setAvailableImages(imagesRes.images || []);
        } catch (e) {
          console.error('Failed to load images:', e);
        }
        // 取得 MIG 狀態
        const migRes = await getMigStatus();
        const migInfo = migRes.mig_info || {};
        const migModes = migRes.mig_modes || {};
        
        // 取得即時 GPU 指標
        const metricsRes = await getGpuMetrics();
        const gpuMetrics = metricsRes.gpus || [];
        
        // 轉換為前端格式，結合 MIG 狀態和即時指標
        const gpuData = Object.entries(migInfo).map(([gpuId, info]) => {
          const gpuIndex = parseInt(gpuId);
          const metrics = gpuMetrics.find(g => g.index === gpuIndex) || {};
          
          return {
            id: `gpu-${gpuId}`,
            name: metrics.name || 'NVIDIA H200 (80GB)',
            gpuIndex: gpuIndex,
            migEnabled: migModes[gpuIndex] || false,
            instances: info.instances || [],
            memory: { 
              total: metrics.memory?.total || 81920, 
              used: metrics.memory?.used || 0 
            },
            utilization: metrics.utilization || 0,
            temperature: metrics.temperature || 0,
            status: (info.instances?.length || 0) > 0 ? 'running' : 'idle'
          };
        });
        
        setGpus(gpuData);
        
        // 取得容器列表
        const containerRes = await listContainers();
        const containerData = (containerRes.containers || []).map(c => {
          const portMatch = c.ports?.match(/:(\d+)->/);
          const port = portMatch ? parseInt(portMatch[1]) : 0;
          const gpuId = Math.floor((port - 1) / 10000);
          
          return {
            id: c.id,
            name: c.id.substring(0, 12),
            user: 'user',
            gpuId: `gpu-${gpuId}`,
            startTime: new Date().toLocaleString('zh-TW'),
            status: c.status?.includes('Up') ? 'running' : 'stopped',
            image: c.image,
            ports: c.ports
          };
        });
        
        setContainers(containerData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSnackbar({
        open: true,
        message: '載入資料失敗: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 連線/斷線
  const handleConnect = async () => {
    setActionLoading('connect');
    try {
      await connect();
      setSnackbar({ open: true, message: 'SSH 連線成功', severity: 'success' });
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: '連線失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnect');
    try {
      await disconnect();
      setIsConnected(false);
      setSnackbar({ open: true, message: '已斷開連線', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: '斷線失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  // 啟動容器
  const handleStartContainer = async () => {
    setActionLoading('start-container');
    try {
      const result = await startContainer(
        containerConfig.deviceId,
        containerConfig.nums,
        containerConfig.image
      );
      setSnackbar({ 
        open: true, 
        message: `已啟動 ${containerConfig.nums} 個容器，Port: ${result.ports?.join(', ')}`,
        severity: 'success'
      });
      setShowStartDialog(false);
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: '啟動容器失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  // 停止所有容器
  const handleStopAllContainers = async () => {
    if (!window.confirm('確定要停止所有容器嗎？')) return;
    
    setActionLoading('stop-all');
    try {
      await stopAllContainers();
      setSnackbar({ open: true, message: '所有容器已停止', severity: 'success' });
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: '停止容器失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const handleViewLogs = async (container) => {
    setSelectedContainer(container);
    setContainerLogs(`容器 ID: ${container.id}\n映像檔: ${container.image}\nPorts: ${container.ports}\n\n（容器日誌功能開發中）`);
    setShowLogsDialog(true);
  };

  const handleStopContainer = async () => {
    try {
      await stopContainer(selectedContainer.id);
      setShowStopDialog(false);
      setSelectedContainer(null);
      setSnackbar({
        open: true,
        message: '容器已停止',
        severity: 'success'
      });
      loadData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '停止容器失敗: ' + error.message,
        severity: 'error'
      });
    }
  };

  const getMemoryPercentage = (gpu) => {
    return Math.round((gpu.memory.used / gpu.memory.total) * 100);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'idle':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTemperatureColor = (temp) => {
    if (temp >= 80) return 'error';
    if (temp >= 70) return 'warning';
    return 'success';
  };

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={600}>
              GPU 資源監控
            </Typography>
            <Typography variant="body2" color="text.secondary">
              即時監控 H200 GPU 使用狀態與運行中的容器
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={isConnected ? <LinkIcon /> : <LinkOffIcon />}
              label={isConnected ? `已連線: ${hostname}` : '未連線'}
              color={isConnected ? 'success' : 'default'}
              variant="outlined"
              size="small"
            />
            {isConnected ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleDisconnect}
                disabled={actionLoading === 'disconnect'}
              >
                {actionLoading === 'disconnect' ? <CircularProgress size={16} /> : '斷開連線'}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                onClick={handleConnect}
                disabled={actionLoading === 'connect'}
              >
                {actionLoading === 'connect' ? <CircularProgress size={16} /> : '連線'}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {!isConnected && (
        <Alert severity="warning">
          請先點擊「連線」按鈕以連接 H200 GPU 伺服器
        </Alert>
      )}

      {/* 快速操作 */}
      {isConnected && (
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            容器操作
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowStartDialog(true)}
            >
              啟動容器
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleStopAllContainers}
              disabled={actionLoading === 'stop-all' || containers.length === 0}
            >
              {actionLoading === 'stop-all' ? <CircularProgress size={16} /> : '停止所有容器'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* GPU 狀態卡片 */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <MemoryIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            GPU 狀態
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="重新整理">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Grid container spacing={2}>
          {gpus.map((gpu) => (
            <Grid item xs={12} sm={6} md={3} key={gpu.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" fontWeight={600}>
                      {gpu.id.toUpperCase()}
                    </Typography>
                    <Chip
                      label={gpu.status === 'running' ? '運行中' : '閒置'}
                      color={getStatusColor(gpu.status)}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    {gpu.name}
                  </Typography>

                  <Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption">記憶體使用</Typography>
                      <Typography variant="caption">
                        {formatMemory(gpu.memory.used)} / {formatMemory(gpu.memory.total)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={getMemoryPercentage(gpu)}
                      sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                    />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption">GPU 使用率</Typography>
                      <Typography variant="caption">{gpu.utilization}%</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={gpu.utilization}
                      color={gpu.utilization > 90 ? 'warning' : 'primary'}
                      sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                    />
                  </Box>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption">溫度</Typography>
                    <Chip
                      label={`${gpu.temperature}°C`}
                      color={getTemperatureColor(gpu.temperature)}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* 運行中的容器 */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          運行中的容器
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>容器名稱</TableCell>
                <TableCell>使用者</TableCell>
                <TableCell>映像檔</TableCell>
                <TableCell>GPU</TableCell>
                <TableCell>啟動時間</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {containers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell>{container.name}</TableCell>
                  <TableCell>{container.user}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {container.image}
                    </Typography>
                  </TableCell>
                  <TableCell>{container.gpuId}</TableCell>
                  <TableCell>{container.startTime}</TableCell>
                  <TableCell>
                    <Chip
                      label={container.status === 'running' ? '運行中' : container.status}
                      color={getStatusColor(container.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="查看日誌">
                      <IconButton size="small" onClick={() => handleViewLogs(container)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="強制停止">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedContainer(container);
                          setShowStopDialog(true);
                        }}
                      >
                        <StopIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {containers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">目前無運行中的容器</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 日誌對話框 */}
      <Dialog open={showLogsDialog} onClose={() => setShowLogsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>容器日誌 - {selectedContainer?.name}</DialogTitle>
        <DialogContent>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: 'grey.900',
              color: 'grey.100',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              maxHeight: 400,
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}
          >
            {containerLogs}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogsDialog(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 停止確認對話框 */}
      <Dialog open={showStopDialog} onClose={() => setShowStopDialog(false)}>
        <DialogTitle>確認強制停止</DialogTitle>
        <DialogContent>
          <Typography>
            確定要強制停止容器「{selectedContainer?.name}」嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            這將立即終止該容器的所有運行中程序，未儲存的資料可能會遺失。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStopDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleStopContainer}>
            強制停止
          </Button>
        </DialogActions>
      </Dialog>

      {/* 啟動容器對話框 */}
      <Dialog open={showStartDialog} onClose={() => setShowStartDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>啟動新容器</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>選擇 GPU</InputLabel>
              <Select
                value={containerConfig.deviceId}
                label="選擇 GPU"
                onChange={(e) => setContainerConfig({ ...containerConfig, deviceId: e.target.value })}
              >
                {gpus.map((gpu) => (
                  <MenuItem key={gpu.gpuIndex} value={gpu.gpuIndex}>
                    GPU {gpu.gpuIndex} - {gpu.name} {gpu.migEnabled ? '(MIG)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="容器數量"
              type="number"
              value={containerConfig.nums}
              onChange={(e) => setContainerConfig({ ...containerConfig, nums: parseInt(e.target.value) || 1 })}
              fullWidth
              inputProps={{ min: 1, max: 7 }}
              helperText="MIG 模式下最多 7 個容器"
            />
            <FormControl fullWidth>
              <InputLabel>選擇映像檔</InputLabel>
              <Select
                value={containerConfig.image}
                label="選擇映像檔"
                onChange={(e) => setContainerConfig({ ...containerConfig, image: e.target.value })}
              >
                {availableImages.map((img, idx) => (
                  <MenuItem key={idx} value={img.fullName || `${img.name}:${img.tag}`}>
                    {img.name}:{img.tag} ({img.size})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStartDialog(false)}>取消</Button>
          <Button 
            variant="contained" 
            onClick={handleStartContainer}
            disabled={actionLoading === 'start-container' || !containerConfig.image}
          >
            {actionLoading === 'start-container' ? <CircularProgress size={16} /> : '啟動'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
};

export default GpuMonitor;
