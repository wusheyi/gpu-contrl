import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer,
  connect,
  getConnectionStatus
} from '../../services/connectorApi';

const StudentGpuAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [availableMigs, setAvailableMigs] = useState([]);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoDistributeDialogOpen, setAutoDistributeDialogOpen] = useState(false);
  const [autoDistributeGpuId, setAutoDistributeGpuId] = useState('');
  const [distributing, setDistributing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [formData, setFormData] = useState({
    studentId: '',
    studentEmail: '',
    gpuId: 0,
    migIndex: 0,
    duration: 120
  });

  // H200 GPU 配置 (4 GPUs, 每個可分割 7 個 MIG)
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10; // GB per MIG instance

  useEffect(() => {
    checkConnection();
    loadData();
  }, []);

  // 檢查連線狀態
  const checkConnection = async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected || false);
    } catch {
      setConnected(false);
    }
  };

  // 自動連線到 GPU 伺服器
  const handleConnect = async () => {
    try {
      await connect('10.133.77.231', 'ai', 'your-password');
      setConnected(true);
      setSnackbar({ open: true, message: '已連線到 H200 GPU 伺服器', severity: 'success' });
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: `連線失敗: ${error.message}`, severity: 'error' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 取得 MIG 狀態和容器列表
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      // 解析 MIG 狀態，構建可用 MIG 列表
      const migs = [];
      const containerList = containerData.containers || [];
      setContainers(containerList);

      // 從 MIG 資訊建立可用分區列表
      if (migData.mig_info) {
        Object.entries(migData.mig_info).forEach(([gpuId, gpuInfo]) => {
          if (gpuInfo.mig_enabled && gpuInfo.instances) {
            gpuInfo.instances.forEach((instance, idx) => {
              // 計算此 MIG 對應的 port
              const portBase = parseInt(gpuId) * 10000 + 1;
              const expectedPort = portBase + idx;
              
              // 檢查是否已被容器使用
              const isUsed = containerList.some(c => 
                c.ports && c.ports.some(p => p.host_port === expectedPort)
              );

              if (!isUsed) {
                migs.push({
                  id: `gpu${gpuId}-mig${instance.gi_id}`,
                  gpuId: parseInt(gpuId),
                  gpuName: GPU_NAME,
                  giId: instance.gi_id,
                  size: '1g.10gb',
                  memory: MIG_MEMORY,
                  placement: instance.placement
                });
              }
            });
          }
        });
      }

      setAvailableMigs(migs);

      // 從容器列表建立分配狀態（每個運行中的容器代表一個分配）
      const allocs = containerList.map((container, idx) => {
        // 從 port 推算 GPU ID
        const port = container.ports?.[0]?.host_port || 0;
        const gpuId = Math.floor(port / 10000);
        const migIndex = (port % 10000) - 1;

        return {
          id: container.id,
          student: {
            id: `student-${idx}`,
            name: `學生 ${idx + 1}`,
            email: `student${idx + 1}@nkust.edu.tw`
          },
          container: {
            id: container.id,
            name: container.name,
            image: container.image
          },
          gpu: {
            gpuId: gpuId,
            gpuName: GPU_NAME,
            migIndex: migIndex,
            migSize: '1g.10gb',
            memory: MIG_MEMORY
          },
          port: port,
          sshCommand: `ssh root@10.133.77.231 -p ${port}`,
          status: container.status?.includes('Up') ? 'active' : 'stopped',
          allocatedAt: container.created || new Date().toISOString()
        };
      });

      setAllocations(allocs);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSnackbar({ open: true, message: `載入失敗: ${error.message}`, severity: 'error' });
    }
    setLoading(false);
  };

  // 分配 GPU（啟動容器）
  const handleAllocate = async () => {
    try {
      setLoading(true);
      const result = await startContainer(formData.gpuId, 1, 'ssh-nvidia:latest');
      setSnackbar({ 
        open: true, 
        message: `已分配 GPU ${formData.gpuId} 給學生，Port: ${result.ports?.[0] || 'N/A'}`, 
        severity: 'success' 
      });
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: `分配失敗: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 收回分配（停止容器）
  const handleDeallocate = async (allocation) => {
    if (window.confirm(`確定要收回此學生的 GPU 分配嗎？\n容器: ${allocation.container?.name || allocation.id}`)) {
      try {
        await stopContainer(allocation.id);
        setSnackbar({ open: true, message: '已收回 GPU 分配', severity: 'success' });
        loadData();
      } catch (error) {
        setSnackbar({ open: true, message: `收回失敗: ${error.message}`, severity: 'error' });
      }
    }
  };

  // 自動平均分配功能
  const handleAutoDistribute = async () => {
    if (autoDistributeGpuId === '') return;
    setDistributing(true);
    try {
      const gpuId = parseInt(autoDistributeGpuId);
      // 在選定的 GPU 上啟動多個容器
      const numContainers = Math.min(MIG_PER_GPU, 5); // 一次最多分配 5 個
      const result = await startContainer(gpuId, numContainers, 'ssh-nvidia:latest');
      setSnackbar({ 
        open: true, 
        message: `已在 GPU ${gpuId} 上啟動 ${result.ports?.length || numContainers} 個容器`, 
        severity: 'success' 
      });
      setAutoDistributeDialogOpen(false);
      setAutoDistributeGpuId('');
      loadData();
    } catch (error) {
      setSnackbar({ open: true, message: `自動分配失敗: ${error.message}`, severity: 'error' });
    }
    setDistributing(false);
  };

  // GPU 選項列表
  const gpuOptions = Array.from({ length: GPU_COUNT }, (_, i) => ({
    id: i,
    name: `GPU ${i} (${GPU_NAME})`
  }));

  const resetForm = () => {
    setFormData({
      studentId: '',
      studentEmail: '',
      gpuId: 0,
      migIndex: 0,
      duration: 120
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      running: 'success',
      idle: 'warning',
      stopped: 'default',
      expired: 'default',
      error: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '運行中',
      running: '運行中',
      idle: '閒置',
      stopped: '已停止',
      expired: '已過期',
      error: '錯誤'
    };
    return labels[status] || status;
  };

  // 複製 SSH 指令
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: '已複製到剪貼簿', severity: 'info' });
  };

  const activeAllocations = allocations.filter(a => a.status === 'active' || a.status === 'running');
  const totalMemoryAllocated = activeAllocations.length * MIG_MEMORY;

  return (
    <Box>
      {/* 連線狀態提示 */}
      {!connected && (
        <Alert severity="warning" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={handleConnect}>
            連線
          </Button>
        }>
          尚未連線到 H200 GPU 伺服器
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>學生 GPU 分配</Typography>
          <Typography variant="body2" color="text.secondary">
            將 H200 GPU MIG 資源分配給學生進行深度學習實作
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip 
            label={connected ? '已連線' : '未連線'} 
            color={connected ? 'success' : 'default'}
            size="small"
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>
            重新整理
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<AutoAwesomeIcon />} 
            onClick={() => setAutoDistributeDialogOpen(true)}
          >
            批次分配
          </Button>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setDialogOpen(true)}>
            啟動容器
          </Button>
        </Stack>
      </Stack>

      {/* 統計卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{activeAllocations.length}</Typography>
              <Typography variant="body2" color="text.secondary">運行中容器</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <MemoryIcon color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{totalMemoryAllocated} GB</Typography>
              <Typography variant="body2" color="text.secondary">已分配記憶體</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{GPU_COUNT}</Typography>
              <Typography variant="body2" color="text.secondary">可用 GPU</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <MemoryIcon color="info" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{availableMigs.length}</Typography>
              <Typography variant="body2" color="text.secondary">可用 MIG 分區</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* 目前分配列表 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>運行中的容器</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>容器 ID</TableCell>
                  <TableCell>映像檔</TableCell>
                  <TableCell align="center">GPU</TableCell>
                  <TableCell align="center">Port</TableCell>
                  <TableCell>SSH 指令</TableCell>
                  <TableCell align="center">狀態</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>
                        目前沒有運行中的容器
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : allocations.map((alloc) => (
                  <TableRow key={alloc.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {alloc.id?.substring(0, 12)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{alloc.container?.image || 'ssh-nvidia'}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        size="small" 
                        label={`GPU ${alloc.gpu?.gpuId}`} 
                        color="primary"
                        variant="outlined" 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>{alloc.port}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {alloc.sshCommand}
                        </Typography>
                        <Tooltip title="複製">
                          <IconButton size="small" onClick={() => copyToClipboard(alloc.sshCommand)}>
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={getStatusLabel(alloc.status)} color={getStatusColor(alloc.status)} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="停止容器">
                        <IconButton size="small" color="error" onClick={() => handleDeallocate(alloc)}>
                          <StopIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 可用 MIG 分區 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>可用 MIG 分區</Typography>
          {availableMigs.length === 0 ? (
            <Alert severity="info">
              目前沒有可用的 MIG 分區。請先在管理面板中設定 MIG 分割。
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {availableMigs.map((mig) => (
                <Grid item xs={12} sm={6} md={3} key={mig.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <MemoryIcon color="primary" />
                        <Typography variant="subtitle2">{mig.gpuName}</Typography>
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">GPU / GI ID</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        GPU {mig.gpuId} / GI {mig.giId}
                      </Typography>
                      <Grid container spacing={1} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">大小</Typography>
                          <Typography variant="body2">{mig.size}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">記憶體</Typography>
                          <Typography variant="body2">{mig.memory} GB</Typography>
                        </Grid>
                      </Grid>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<PlayArrowIcon />}
                        sx={{ mt: 2 }}
                        onClick={() => {
                          setFormData({ ...formData, gpuId: mig.gpuId });
                          setDialogOpen(true);
                        }}
                      >
                        啟動容器
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* 啟動容器對話框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PlayArrowIcon color="primary" />
            <span>啟動 GPU 容器</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              在選定的 GPU 上啟動一個 Docker 容器，提供 SSH 存取給學生使用。
            </Alert>
            <FormControl fullWidth required>
              <InputLabel>選擇 GPU</InputLabel>
              <Select
                value={formData.gpuId}
                label="選擇 GPU"
                onChange={(e) => setFormData({ ...formData, gpuId: e.target.value })}
              >
                {gpuOptions.map((gpu) => (
                  <MenuItem key={gpu.id} value={gpu.id}>
                    {gpu.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="學生 Email (選填)"
              value={formData.studentEmail}
              onChange={(e) => setFormData({ ...formData, studentEmail: e.target.value })}
              fullWidth
              placeholder="student@nkust.edu.tw"
              helperText="用於記錄分配資訊"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleAllocate}
            startIcon={<PlayArrowIcon />}
          >
            啟動容器
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批次分配對話框 */}
      <Dialog open={autoDistributeDialogOpen} onClose={() => setAutoDistributeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <AutoAwesomeIcon color="secondary" />
            <span>批次啟動 GPU 容器</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              在選定的 GPU 上批次啟動多個容器，適合為整個班級分配 GPU 資源。
              每個 GPU 最多可啟動 {MIG_PER_GPU} 個容器。
            </Alert>
            <FormControl fullWidth required>
              <InputLabel>選擇 GPU</InputLabel>
              <Select
                value={autoDistributeGpuId}
                label="選擇 GPU"
                onChange={(e) => setAutoDistributeGpuId(e.target.value)}
              >
                {gpuOptions.map((gpu) => (
                  <MenuItem key={gpu.id} value={gpu.id}>
                    {gpu.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {autoDistributeGpuId !== '' && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>分配預覽</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">選擇的 GPU</Typography>
                    <Typography variant="body1" fontWeight={600}>GPU {autoDistributeGpuId}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">預計啟動容器數</Typography>
                    <Typography variant="body1" fontWeight={600}>最多 5 個</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">每個容器配置</Typography>
                    <Typography variant="body1" fontWeight={600} color="primary.main">
                      1g.10gb MIG ({MIG_MEMORY} GB 記憶體)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutoDistributeDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAutoDistribute}
            disabled={autoDistributeGpuId === '' || distributing}
            startIcon={<AutoAwesomeIcon />}
          >
            {distributing ? '啟動中...' : '批次啟動'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar 通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentGpuAllocation;
