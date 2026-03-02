import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

import {
  getConnectionStatus,
  connect,
  disconnect,
  getGpuStatus,
  getMigStatus,
  enableMig,
  fullMigSetup,
  cleanupMig,
  shutdownGpu,
  startContainer,
  startContainersBatch,
  listContainers,
  stopContainer,
  stopAllContainers
} from '../../services/connectorApi';

const H200Control = () => {
  // 連線狀態
  const [isConnected, setIsConnected] = useState(false);
  const [hostname, setHostname] = useState('');
  
  // GPU 狀態
  const [gpuOutput, setGpuOutput] = useState('');
  const [migInfo, setMigInfo] = useState({});
  const [migModes, setMigModes] = useState({});
  const [containers, setContainers] = useState([]);
  
  // UI 狀態
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 對話框
  const [migSetupDialog, setMigSetupDialog] = useState(false);
  const [containerDialog, setContainerDialog] = useState(false);
  const [shutdownDialog, setShutdownDialog] = useState({ open: false, gpuId: null });
  
  // 表單狀態
  const [selectedGpus, setSelectedGpus] = useState([0, 1, 2, 3]);
  const [containerConfig, setContainerConfig] = useState({
    deviceId: 0,
    nums: 1,
    image: 'ssh-nvidia:latest'
  });

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 檢查連線狀態
      const statusRes = await getConnectionStatus();
      setIsConnected(statusRes.connected);
      setHostname(statusRes.hostname || '');
      
      if (statusRes.connected) {
        // 取得 GPU 狀態
        const [gpuRes, migRes, containerRes] = await Promise.all([
          getGpuStatus(),
          getMigStatus(),
          listContainers()
        ]);
        
        setGpuOutput(gpuRes.output || '');
        setMigInfo(migRes.mig_info || {});
        setMigModes(migRes.mig_modes || {});
        setContainers(containerRes.containers || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      showSnackbar('載入資料失敗: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 連線/斷線
  const handleConnect = async () => {
    setActionLoading('connect');
    try {
      await connect();
      showSnackbar('SSH 連線成功');
      loadData();
    } catch (error) {
      showSnackbar('連線失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnect');
    try {
      await disconnect();
      setIsConnected(false);
      showSnackbar('已斷開連線');
    } catch (error) {
      showSnackbar('斷線失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // MIG 設定
  const handleFullMigSetup = async () => {
    setActionLoading('mig-setup');
    try {
      const result = await fullMigSetup(selectedGpus);
      showSnackbar(result.message || 'MIG 設定完成');
      setMigSetupDialog(false);
      loadData();
    } catch (error) {
      showSnackbar('MIG 設定失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleCleanupMig = async () => {
    if (!window.confirm('確定要清理所有 MIG 設定嗎？這會停止所有容器並關閉 MIG。')) return;
    
    setActionLoading('mig-cleanup');
    try {
      const result = await cleanupMig();
      showSnackbar(result.message || 'MIG 清理完成');
      loadData();
    } catch (error) {
      showSnackbar('清理失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // 容器管理
  const handleStartContainer = async () => {
    setActionLoading('start-container');
    try {
      const result = await startContainer(
        containerConfig.deviceId,
        containerConfig.nums,
        containerConfig.image
      );
      showSnackbar(`已啟動 ${containerConfig.nums} 個容器，Port: ${result.ports?.join(', ')}`);
      setContainerDialog(false);
      loadData();
    } catch (error) {
      showSnackbar('啟動容器失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleStopContainer = async (containerId) => {
    setActionLoading(`stop-${containerId}`);
    try {
      await stopContainer(containerId);
      showSnackbar('容器已停止');
      loadData();
    } catch (error) {
      showSnackbar('停止容器失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleStopAllContainers = async () => {
    if (!window.confirm('確定要停止所有容器嗎？')) return;
    
    setActionLoading('stop-all');
    try {
      await stopAllContainers();
      showSnackbar('所有容器已停止');
      loadData();
    } catch (error) {
      showSnackbar('停止容器失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // GPU 關機
  const handleShutdownGpu = async () => {
    const gpuId = shutdownDialog.gpuId;
    setActionLoading(`shutdown-${gpuId}`);
    try {
      const result = await shutdownGpu(gpuId);
      showSnackbar(result.message || `GPU ${gpuId} 已關閉`);
      setShutdownDialog({ open: false, gpuId: null });
      loadData();
    } catch (error) {
      showSnackbar('GPU 關閉失敗: ' + error.message, 'error');
    } finally {
      setActionLoading('');
    }
  };

  // 解析容器的 GPU ID
  const getGpuFromPort = (portsStr) => {
    if (!portsStr) return '-';
    const match = portsStr.match(/:(\d+)->/);
    if (match) {
      const port = parseInt(match[1]);
      return `GPU ${Math.floor((port - 1) / 10000)}`;
    }
    return '-';
  };

  // 解析容器的 Port
  const getPortFromPorts = (portsStr) => {
    if (!portsStr) return '-';
    const match = portsStr.match(/:(\d+)->/);
    return match ? match[1] : '-';
  };

  const toggleGpuSelection = (gpuId) => {
    setSelectedGpus(prev =>
      prev.includes(gpuId)
        ? prev.filter(id => id !== gpuId)
        : [...prev, gpuId]
    );
  };

  return (
    <Box>
      {/* 標題區 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            H200 GPU 控制台
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理 NVIDIA H200 GPU 的 MIG 分割與容器部署
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            icon={isConnected ? <LinkIcon /> : <LinkOffIcon />}
            label={isConnected ? `已連線: ${hostname}` : '未連線'}
            color={isConnected ? 'success' : 'default'}
            variant="outlined"
          />
          {isConnected ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDisconnect}
              disabled={actionLoading === 'disconnect'}
            >
              斷開連線
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleConnect}
              disabled={actionLoading === 'connect'}
            >
              {actionLoading === 'connect' ? <CircularProgress size={20} /> : '連線'}
            </Button>
          )}
          <Tooltip title="重新整理">
            <IconButton onClick={loadData} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {!isConnected ? (
        <Alert severity="warning">
          請先點擊「連線」按鈕以連接 H200 GPU 伺服器
        </Alert>
      ) : (
        <>
          {/* 快速操作 */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              快速操作
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Button
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => setMigSetupDialog(true)}
              >
                MIG 完整設定
              </Button>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setContainerDialog(true)}
              >
                啟動容器
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<StopIcon />}
                onClick={handleStopAllContainers}
                disabled={actionLoading === 'stop-all' || containers.length === 0}
              >
                停止所有容器
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleCleanupMig}
                disabled={actionLoading === 'mig-cleanup'}
              >
                清理 MIG
              </Button>
            </Stack>
          </Paper>

          {/* GPU 狀態卡片 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            <MemoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            GPU 狀態
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[0, 1, 2, 3].map((gpuId) => {
              const info = migInfo[gpuId] || {};
              const migEnabled = migModes[gpuId] || false;
              const instances = info.instances || [];
              
              return (
                <Grid item xs={12} sm={6} md={3} key={gpuId}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight={600}>
                            GPU {gpuId}
                          </Typography>
                          <Chip
                            size="small"
                            label={migEnabled ? 'MIG 啟用' : 'MIG 關閉'}
                            color={migEnabled ? 'success' : 'default'}
                          />
                        </Stack>
                        
                        <Typography variant="body2" color="text.secondary">
                          NVIDIA H200 (80GB)
                        </Typography>
                        
                        <Divider />
                        
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            MIG 實例: {instances.length} 個
                          </Typography>
                          {instances.length > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                              {instances.map((inst, idx) => (
                                <Chip
                                  key={idx}
                                  size="small"
                                  label={`GI ${inst.gi_id}`}
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                        
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<PowerSettingsNewIcon />}
                          onClick={() => setShutdownDialog({ open: true, gpuId })}
                          disabled={actionLoading === `shutdown-${gpuId}`}
                        >
                          關閉此 GPU
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* 運行中的容器 */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                運行中的容器 ({containers.length})
              </Typography>
            </Stack>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>容器 ID</TableCell>
                    <TableCell>映像檔</TableCell>
                    <TableCell>GPU</TableCell>
                    <TableCell>SSH Port</TableCell>
                    <TableCell>狀態</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {containers.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {container.id.substring(0, 12)}
                        </Typography>
                      </TableCell>
                      <TableCell>{container.image}</TableCell>
                      <TableCell>{getGpuFromPort(container.ports)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={getPortFromPorts(container.ports)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={container.status?.includes('Up') ? '運行中' : container.status}
                          color={container.status?.includes('Up') ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="停止容器">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleStopContainer(container.id)}
                            disabled={actionLoading === `stop-${container.id}`}
                          >
                            {actionLoading === `stop-${container.id}` ? (
                              <CircularProgress size={16} />
                            ) : (
                              <StopIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {containers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">目前無運行中的容器</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* nvidia-smi 輸出 */}
          {gpuOutput && (
            <Paper
              elevation={0}
              sx={{
                mt: 3,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                nvidia-smi 輸出
              </Typography>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'grey.900',
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  borderRadius: 1,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  maxHeight: 400
                }}
              >
                {gpuOutput}
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* MIG 設定對話框 */}
      <Dialog open={migSetupDialog} onClose={() => setMigSetupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ViewModuleIcon />
            <span>MIG 完整設定</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            此操作會啟用 MIG 模式並將每個 GPU 分割成 7 個 1g.10gb 實例
          </Alert>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>選擇要設定的 GPU：</Typography>
          <Stack direction="row" spacing={1}>
            {[0, 1, 2, 3].map((gpuId) => (
              <Chip
                key={gpuId}
                label={`GPU ${gpuId}`}
                onClick={() => toggleGpuSelection(gpuId)}
                color={selectedGpus.includes(gpuId) ? 'primary' : 'default'}
                variant={selectedGpus.includes(gpuId) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMigSetupDialog(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleFullMigSetup}
            disabled={actionLoading === 'mig-setup' || selectedGpus.length === 0}
          >
            {actionLoading === 'mig-setup' ? <CircularProgress size={20} /> : '開始設定'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 啟動容器對話框 */}
      <Dialog open={containerDialog} onClose={() => setContainerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlayArrowIcon />
            <span>啟動容器</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>選擇 GPU</InputLabel>
              <Select
                value={containerConfig.deviceId}
                label="選擇 GPU"
                onChange={(e) => setContainerConfig({ ...containerConfig, deviceId: e.target.value })}
              >
                {[0, 1, 2, 3].map((gpuId) => (
                  <MenuItem key={gpuId} value={gpuId}>
                    GPU {gpuId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="容器數量"
              type="number"
              value={containerConfig.nums}
              onChange={(e) => setContainerConfig({ ...containerConfig, nums: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1, max: 7 }}
              helperText="MIG 模式下每個 GPU 最多 7 個容器"
            />
            
            <TextField
              label="Docker 映像檔"
              value={containerConfig.image}
              onChange={(e) => setContainerConfig({ ...containerConfig, image: e.target.value })}
              helperText="例如: ssh-nvidia:latest"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContainerDialog(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleStartContainer}
            disabled={actionLoading === 'start-container'}
          >
            {actionLoading === 'start-container' ? <CircularProgress size={20} /> : '啟動'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GPU 關閉確認對話框 */}
      <Dialog open={shutdownDialog.open} onClose={() => setShutdownDialog({ open: false, gpuId: null })}>
        <DialogTitle>確認關閉 GPU</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            此操作將會：
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>停止 GPU {shutdownDialog.gpuId} 上所有運行中的容器</li>
              <li>刪除所有 MIG 實例 (CI 和 GI)</li>
              <li>關閉 MIG 權限</li>
            </ul>
          </Alert>
          <Typography>確定要關閉 GPU {shutdownDialog.gpuId} 嗎？</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShutdownDialog({ open: false, gpuId: null })}>取消</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleShutdownGpu}
            disabled={actionLoading === `shutdown-${shutdownDialog.gpuId}`}
          >
            {actionLoading === `shutdown-${shutdownDialog.gpuId}` ? <CircularProgress size={20} /> : '確認關閉'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default H200Control;
