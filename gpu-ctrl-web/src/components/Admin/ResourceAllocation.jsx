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
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import MergeIcon from '@mui/icons-material/Merge';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import InfoIcon from '@mui/icons-material/Info';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

import {
  getConnectionStatus,
  getMigStatus,
  getGpuMetrics,
  fullMigSetup,
  shutdownGpu,
  enableMig,
  partitionMig,
  connect,
  disconnect,
  cleanupMig,
  deleteMigInstance
} from '../../services/connectorApi';

const ResourceAllocation = () => {
  const [gpuResources, setGpuResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [migDialogOpen, setMigDialogOpen] = useState(false);
  const [aggregateDialogOpen, setAggregateDialogOpen] = useState(false);
  const [selectedGpu, setSelectedGpu] = useState(null);
  const [selectedGpus, setSelectedGpus] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hostname, setHostname] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [migConfig, setMigConfig] = useState({
    profileId: '1g.10gb',
    count: 7
  });

  // MIG 配置選項 (H200 專用)
  const migProfiles = [
    { id: '1g.10gb', label: '1g.10gb (1 GPU 實例, 10GB)', profile: '19', slices: 1 },
    { id: '2g.20gb', label: '2g.20gb (2 GPU 實例, 20GB)', profile: '14', slices: 2 },
    { id: '3g.40gb', label: '3g.40gb (3 GPU 實例, 40GB)', profile: '9', slices: 3 },
    { id: '7g.80gb', label: '7g.80gb (7 GPU 實例, 80GB - 整顆 GPU)', profile: '0', slices: 7 }
  ];

  // 聚合資源 (未實作)
  const [aggregatedResources, setAggregatedResources] = useState([]);

  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await getConnectionStatus();
      setIsConnected(statusRes.connected);
      setHostname(statusRes.hostname || '');
      
      if (statusRes.connected) {
        // 取得 MIG 狀態
        const migRes = await getMigStatus();
        const migInfo = migRes.mig_info || {};
        const migModes = migRes.mig_modes || {};
        
        // 取得 GPU 即時指標
        const metricsRes = await getGpuMetrics();
        const gpuMetrics = metricsRes.gpus || [];
        
        // 轉換為前端格式，結合 MIG 狀態和即時指標
        const resources = Object.entries(migInfo).map(([gpuId, info]) => {
          const gpuIndex = parseInt(gpuId);
          const metrics = gpuMetrics.find(g => g.index === gpuIndex) || {};
          
          return {
            id: `gpu-${gpuId}`,
            name: metrics.name || 'NVIDIA H200-SXM-80GB',
            uuid: `GPU-${gpuId}`,
            gpuIndex: gpuIndex,
            memory: { 
              total: metrics.memory?.total || 81920, 
              used: metrics.memory?.used || 0, 
              free: (metrics.memory?.total || 81920) - (metrics.memory?.used || 0) 
            },
            utilization: metrics.utilization || 0,
            temperature: metrics.temperature || 0,
            power: { 
              current: metrics.power?.draw || 0, 
              max: metrics.power?.limit || 400 
            },
            migEnabled: migModes[gpuIndex] || false,
            migPartitions: (info.instances || []).map((inst, idx) => ({
              id: `mig-${inst.gi_id}`,
              gi_id: inst.gi_id,
              profile: '1g.10gb',
              memory: 10240,
              inUse: false,
              user: null
            })),
            status: (info.instances?.length || 0) > 0 ? 'in-use' : 'available'
          };
        });
        
        setGpuResources(resources);
      }
    } catch (error) {
      console.error('Failed to fetch GPU resources:', error);
      setSnackbar({ open: true, message: '載入資源失敗: ' + error.message, severity: 'error' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // 連線處理
  const handleConnect = async () => {
    setActionLoading('connect');
    try {
      await connect();
      setSnackbar({ open: true, message: '已連線到 H200', severity: 'success' });
      loadResources();
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
      setHostname('');
      setGpuResources([]);
      setSnackbar({ open: true, message: '已斷開連線', severity: 'info' });
    } catch (error) {
      setSnackbar({ open: true, message: '斷開連線失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  // 完整清理 MIG
  const handleCleanupAllMig = async () => {
    if (!window.confirm('確定要完整清理所有 GPU 的 MIG 設定嗎？這會停止所有容器並釋放所有 MIG 資源。')) return;
    
    setActionLoading('cleanup');
    try {
      await cleanupMig();
      setSnackbar({ open: true, message: '已完成 MIG 清理', severity: 'success' });
      loadResources();
    } catch (error) {
      setSnackbar({ open: true, message: '清理失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const handleCreateMigPartition = async () => {
    setActionLoading('create-mig');
    try {
      const gpuIndex = selectedGpu.gpuIndex;
      const profile = migProfiles.find(p => p.id === migConfig.profileId);
      const profileStr = Array(migConfig.count).fill(profile?.profile || '19').join(',');
      
      // 先啟用 MIG，再分割
      await enableMig([gpuIndex]);
      await partitionMig([gpuIndex], profileStr);
      
      setSnackbar({ open: true, message: 'MIG 分區已建立', severity: 'success' });
      setMigDialogOpen(false);
      loadResources();
    } catch (error) {
      console.error('Failed to create MIG partition:', error);
      setSnackbar({ open: true, message: '建立 MIG 分區失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteMigPartition = async (gpuId, migId = null) => {
    const gpuIndex = parseInt(gpuId.replace('gpu-', ''));
    
    if (migId) {
      // 刪除單一 MIG instance
      const giId = parseInt(migId.replace('mig-', ''));
      if (!window.confirm(`確定要刪除 GPU ${gpuIndex} 的 MIG 實例 (GI: ${giId}) 嗎？`)) return;
      
      setActionLoading(`delete-${migId}`);
      try {
        await deleteMigInstance(gpuIndex, giId);
        setSnackbar({ open: true, message: `MIG 實例 (GI: ${giId}) 已刪除`, severity: 'success' });
        loadResources();
      } catch (error) {
        console.error('Failed to delete MIG instance:', error);
        setSnackbar({ open: true, message: '刪除失敗: ' + error.message, severity: 'error' });
      } finally {
        setActionLoading('');
      }
    } else {
      // 刪除整個 GPU 的所有 MIG 分區
      if (!window.confirm('確定要刪除此 GPU 的所有 MIG 分區嗎？這會關閉 MIG 模式。')) return;
      
      setActionLoading(`delete-${gpuId}`);
      try {
        await shutdownGpu(gpuIndex);
        setSnackbar({ open: true, message: 'MIG 分區已刪除', severity: 'success' });
        loadResources();
      } catch (error) {
        console.error('Failed to delete MIG partition:', error);
        setSnackbar({ open: true, message: '刪除失敗: ' + error.message, severity: 'error' });
      } finally {
        setActionLoading('');
      }
    }
  };

  const handleFullMigSetup = async () => {
    if (selectedGpus.length === 0) return;
    
    setActionLoading('full-setup');
    try {
      await fullMigSetup(selectedGpus.map(id => parseInt(id.replace('gpu-', ''))));
      setSnackbar({ open: true, message: 'MIG 完整設定完成', severity: 'success' });
      setAggregateDialogOpen(false);
      setSelectedGpus([]);
      loadResources();
    } catch (error) {
      console.error('Failed to setup MIG:', error);
      setSnackbar({ open: true, message: 'MIG 設定失敗: ' + error.message, severity: 'error' });
    } finally {
      setActionLoading('');
    }
  };

  const toggleGpuSelection = (gpuId) => {
    setSelectedGpus(prev =>
      prev.includes(gpuId)
        ? prev.filter(id => id !== gpuId)
        : [...prev, gpuId]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'in-use': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return '可用';
      case 'in-use': return '使用中';
      case 'error': return '錯誤';
      default: return status;
    }
  };

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            資源分配管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理 H200 GPU MIG 切割
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
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadResources}
          >
            重新整理
          </Button>
          {isConnected && (
            <>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<CleaningServicesIcon />}
                onClick={handleCleanupAllMig}
                disabled={actionLoading === 'cleanup'}
              >
                {actionLoading === 'cleanup' ? <CircularProgress size={16} /> : '完整清理 MIG'}
              </Button>
              <Button
                variant="contained"
                startIcon={<ViewModuleIcon />}
                onClick={() => setAggregateDialogOpen(true)}
                disabled={selectedGpus.length === 0}
              >
                批次 MIG 設定 ({selectedGpus.length})
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          請先點擊「連線」按鈕以連接 H200 GPU 伺服器
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>MIG (Multi-Instance GPU)</strong>：將單一 H200 GPU 切割為多個獨立的 GPU 實例。
          <br />
          H200 支援將 80GB 記憶體分割成最多 7 個 10GB 實例，適合多租戶環境。
        </Typography>
      </Alert>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={3}>
          {gpuResources.map((gpu) => (
            <Grid item xs={12} lg={6} key={gpu.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: selectedGpus.includes(gpu.id) ? 'primary.main' : 'divider',
                  borderWidth: selectedGpus.includes(gpu.id) ? 2 : 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => toggleGpuSelection(gpu.id)}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <MemoryIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {gpu.id.toUpperCase()}
                      </Typography>
                      <Chip
                        size="small"
                        label={getStatusLabel(gpu.status)}
                        color={getStatusColor(gpu.status)}
                      />
                      {gpu.migEnabled && (
                        <Chip size="small" label="MIG 已啟用" color="success" variant="outlined" />
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {gpu.name}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CallSplitIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGpu(gpu);
                        setMigDialogOpen(true);
                      }}
                    >
                      MIG 設定
                    </Button>
                    {gpu.migEnabled && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={actionLoading === `delete-${gpu.id}` ? <CircularProgress size={16} /> : <PowerSettingsNewIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMigPartition(gpu.id);
                        }}
                        disabled={actionLoading === `delete-${gpu.id}`}
                      >
                        關閉 MIG
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {/* GPU 狀態資訊 */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      記憶體使用
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(gpu.memory.used / gpu.memory.total) * 100}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={gpu.memory.used / gpu.memory.total > 0.9 ? 'error' : 'primary'}
                      />
                      <Typography variant="caption">
                        {formatMemory(gpu.memory.used)} / {formatMemory(gpu.memory.total)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      GPU 使用率
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={gpu.utilization}
                        sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        color={gpu.utilization > 90 ? 'error' : gpu.utilization > 70 ? 'warning' : 'primary'}
                      />
                      <Typography variant="caption">{gpu.utilization}%</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      溫度
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {gpu.temperature}°C
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">
                      功耗
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {gpu.power.current}W / {gpu.power.max}W
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    {gpu.currentUser && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          使用者
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {gpu.currentUser}
                        </Typography>
                      </>
                    )}
                  </Grid>
                </Grid>

                {/* MIG 分區資訊 */}
                {gpu.migEnabled && gpu.migPartitions.length > 0 && (
                  <Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      MIG 分區
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>設定檔</TableCell>
                            <TableCell>記憶體</TableCell>
                            <TableCell>狀態</TableCell>
                            <TableCell align="right">操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gpu.migPartitions.map((mig) => (
                            <TableRow key={mig.id}>
                              <TableCell>{mig.id}</TableCell>
                              <TableCell>{mig.profile}</TableCell>
                              <TableCell>{formatMemory(mig.memory)}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={mig.inUse ? `使用中 (${mig.user})` : '閒置'}
                                  color={mig.inUse ? 'warning' : 'success'}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="刪除此 MIG 實例">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      disabled={mig.inUse || actionLoading === `delete-${mig.id}`}
                                      onClick={() => handleDeleteMigPartition(gpu.id, mig.id)}
                                    >
                                      <CallSplitIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* MIG 設定對話框 */}
      <Dialog open={migDialogOpen} onClose={() => setMigDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CallSplitIcon />
            <span>MIG 分區設定 - {selectedGpu?.id?.toUpperCase()}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            建立 MIG 分區會重新配置 GPU，可能需要數秒鐘時間。
          </Alert>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>MIG 設定檔</InputLabel>
              <Select
                value={migConfig.profileId}
                label="MIG 設定檔"
                onChange={(e) => setMigConfig({ ...migConfig, profileId: e.target.value })}
              >
                {migProfiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box>
              <Typography gutterBottom>
                建立數量: {migConfig.count}
              </Typography>
              <Slider
                value={migConfig.count}
                onChange={(e, value) => setMigConfig({ ...migConfig, count: value })}
                min={1}
                max={7}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMigDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreateMigPartition}
            disabled={actionLoading === 'create-mig'}
          >
            {actionLoading === 'create-mig' ? <CircularProgress size={20} /> : '建立分區'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批次 MIG 設定對話框 */}
      <Dialog open={aggregateDialogOpen} onClose={() => setAggregateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ViewModuleIcon />
            <span>批次 MIG 完整設定</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            此操作會將選中的 GPU 啟用 MIG 並分割成 7 個 1g.10gb 實例。
          </Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            已選擇的 GPU：
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {selectedGpus.map((gpuId) => (
              <Chip
                key={gpuId}
                label={gpuId.toUpperCase()}
                onDelete={() => toggleGpuSelection(gpuId)}
                color="primary"
              />
            ))}
          </Stack>
          {selectedGpus.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                設定後每個 GPU 將有 7 個 MIG 實例，總共 {selectedGpus.length * 7} 個實例
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAggregateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleFullMigSetup}
            disabled={selectedGpus.length === 0 || actionLoading === 'full-setup'}
          >
            {actionLoading === 'full-setup' ? <CircularProgress size={20} /> : '開始設定'}
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

export default ResourceAllocation;
