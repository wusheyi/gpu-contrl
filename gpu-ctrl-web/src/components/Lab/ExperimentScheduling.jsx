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
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MemoryIcon from '@mui/icons-material/Memory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TerminalIcon from '@mui/icons-material/Terminal';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer,
  getConnectionStatus
} from '../../services/connectorApi';

const ExperimentScheduling = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [experimentLogs, setExperimentLogs] = useState('');
  const [formTab, setFormTab] = useState(0);
  const [connected, setConnected] = useState(false);
  const [migInfo, setMigInfo] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    image: 'ssh-nvidia:latest',
    command: '',
    gpuId: 0,
    gpuCount: 1,
    gpuMemory: 10,
    cpuCores: 4,
    ramSize: 32,
    storageSize: 50,
    scheduledStartTime: '',
    estimatedDuration: 120,
    maxRuntime: 480,
    priority: 'normal',
    environment: '',
    datasetPath: '',
    outputPath: ''
  });

  // H200 GPU 配置
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10;

  // 專案配置（基於 GPU 資源）
  const getProjects = () => {
    return [
      { 
        id: 'proj-gpu0', 
        name: 'GPU 0 訓練專案',
        resources: { 
          gpuQuota: MIG_PER_GPU, 
          gpuUsed: experiments.filter(e => e.gpuId === 0 && e.status === 'running').length, 
          storageQuota: 500, 
          storageUsed: 100 
        }
      },
      { 
        id: 'proj-gpu1', 
        name: 'GPU 1 訓練專案',
        resources: { 
          gpuQuota: MIG_PER_GPU, 
          gpuUsed: experiments.filter(e => e.gpuId === 1 && e.status === 'running').length, 
          storageQuota: 500, 
          storageUsed: 100 
        }
      },
      { 
        id: 'proj-gpu2', 
        name: 'GPU 2 訓練專案',
        resources: { 
          gpuQuota: MIG_PER_GPU, 
          gpuUsed: experiments.filter(e => e.gpuId === 2 && e.status === 'running').length, 
          storageQuota: 500, 
          storageUsed: 100 
        }
      },
      { 
        id: 'proj-gpu3', 
        name: 'GPU 3 訓練專案',
        resources: { 
          gpuQuota: MIG_PER_GPU, 
          gpuUsed: experiments.filter(e => e.gpuId === 3 && e.status === 'running').length, 
          storageQuota: 500, 
          storageUsed: 100 
        }
      }
    ];
  };

  // 取得所選專案的可用資源
  const getSelectedProjectResources = () => {
    const projects = getProjects();
    const project = projects.find(p => p.id === formData.projectId);
    if (!project) return null;
    return {
      availableGpu: project.resources.gpuQuota - project.resources.gpuUsed,
      availableStorage: project.resources.storageQuota - project.resources.storageUsed,
      gpuQuota: project.resources.gpuQuota,
      storageQuota: project.resources.storageQuota
    };
  };

  // 驗證資源是否超過專案配額
  const validateResources = () => {
    const projectResources = getSelectedProjectResources();
    if (!projectResources) return { valid: true, errors: [] };
    
    const errors = [];
    if (formData.gpuCount > projectResources.availableGpu) {
      errors.push(`GPU 數量 (${formData.gpuCount}) 超過專案可用配額 (${projectResources.availableGpu}/${projectResources.gpuQuota})`);
    }
    if (formData.storageSize > projectResources.availableStorage) {
      errors.push(`儲存空間 (${formData.storageSize} GB) 超過專案可用配額 (${projectResources.availableStorage}/${projectResources.storageQuota} GB)`);
    }
    return { valid: errors.length === 0, errors };
  };

  const resourceValidation = validateResources();

  useEffect(() => {
    checkConnection();
    loadExperiments();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected || false);
    } catch {
      setConnected(false);
    }
  };

  const loadExperiments = async () => {
    setLoading(true);
    try {
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      setMigInfo(migData.mig_info || {});
      const containers = containerData.containers || [];

      // 將容器轉換為實驗資料
      const exps = containers.map((container, idx) => {
        const port = container.ports?.[0]?.host_port || 0;
        const gpuId = Math.floor(port / 10000);
        const startTime = container.created || new Date().toISOString();

        return {
          id: container.id,
          name: `實驗 ${idx + 1} - ${container.image || 'Unknown'}`,
          description: `運行於 GPU ${gpuId}，Port ${port}`,
          project: {
            id: `proj-gpu${gpuId}`,
            name: `GPU ${gpuId} 訓練專案`
          },
          gpuId: gpuId,
          image: container.image || 'ssh-nvidia:latest',
          command: container.command || '',
          resources: {
            gpuCount: 1,
            gpuType: GPU_NAME,
            gpuMemory: MIG_MEMORY,
            cpuCores: 4,
            ramSize: 32,
            storageSize: 50
          },
          timing: {
            createdAt: startTime,
            scheduledStartTime: startTime,
            actualStartTime: startTime,
            estimatedEndTime: null,
            estimatedDuration: 120,
            maxRuntime: 480,
            elapsedTime: 0,
            remainingTime: 480
          },
          status: container.status?.includes('Up') ? 'running' : 'stopped',
          progress: container.status?.includes('Up') ? 50 : 0,
          priority: 'normal',
          port: port,
          sshCommand: `ssh root@10.133.77.231 -p ${port}`,
          user: {
            id: 'user001',
            name: '研究員',
            email: 'researcher@nkust.edu.tw'
          },
          environment: {
            variables: [],
            datasetPath: '/data',
            outputPath: '/output',
            checkpointPath: '/output/checkpoints'
          },
          results: null
        };
      });

      setExperiments(exps);
    } catch (error) {
      console.error('Failed to fetch experiments:', error);
    }
    setLoading(false);
  };

  const handleCreateExperiment = async () => {
    try {
      // 從專案 ID 解析 GPU ID
      const gpuId = parseInt(formData.projectId.replace('proj-gpu', '')) || formData.gpuId;
      await startContainer(gpuId, formData.gpuCount, formData.image);
      setDialogOpen(false);
      resetForm();
      loadExperiments();
    } catch (error) {
      console.error('Failed to create experiment:', error);
    }
  };

  const handleUpdateExperiment = async () => {
    // 更新實驗設定（目前主要是重新載入資料）
    setDialogOpen(false);
    resetForm();
    loadExperiments();
  };

  const handleDeleteExperiment = async (experimentId) => {
    if (window.confirm('確定要刪除此實驗嗎？這將停止相關容器。')) {
      try {
        await stopContainer(experimentId);
        loadExperiments();
      } catch (error) {
        console.error('Failed to delete experiment:', error);
      }
    }
  };

  const handleStartExperiment = async (experimentId) => {
    try {
      const exp = experiments.find(e => e.id === experimentId);
      if (exp) {
        await startContainer(exp.gpuId, 1, exp.image);
      }
      loadExperiments();
    } catch (error) {
      console.error('Failed to start experiment:', error);
    }
  };

  const handleStopExperiment = async (experimentId) => {
    if (window.confirm('確定要停止此實驗嗎？')) {
      try {
        await stopContainer(experimentId);
        loadExperiments();
      } catch (error) {
        console.error('Failed to stop experiment:', error);
      }
    }
  };

  const handleViewDetails = (experiment) => {
    setSelectedExperiment(experiment);
    setDetailDialogOpen(true);
  };

  const handleViewLogs = async (experiment) => {
    setSelectedExperiment(experiment);
    try {
      const logs = await fetchExperimentLogs(experiment.id);
      setExperimentLogs(logs || generateMockLogs(experiment));
      setLogDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const generateMockLogs = (exp) => {
    return `[${exp.timing?.actualStartTime || exp.timing?.createdAt}] ========================================
[INFO] Experiment: ${exp.name}
[INFO] Project: ${exp.project?.name}
[INFO] ========================================
[INFO] Initializing environment...
[INFO] Image: ${exp.image}
[INFO] GPU: ${exp.resources?.gpuCount} x ${exp.resources?.gpuType}
[INFO] Command: ${exp.command}
[INFO] ----------------------------------------
${exp.environment?.variables?.map(v => `[ENV] ${v.key}=${v.value}`).join('\n')}
[INFO] ----------------------------------------
[INFO] Loading dataset from ${exp.environment?.datasetPath}
[INFO] Output directory: ${exp.environment?.outputPath}
${exp.status === 'running' ? `[INFO] Training in progress... ${exp.progress}% complete` : ''}
${exp.status === 'completed' ? '[INFO] Experiment completed successfully!' : ''}
${exp.results ? `[RESULTS] ${JSON.stringify(exp.results, null, 2)}` : ''}`;
  };

  const handleEditExperiment = (experiment) => {
    setSelectedExperiment(experiment);
    setFormData({
      name: experiment.name,
      description: experiment.description,
      projectId: experiment.project?.id || '',
      image: experiment.image,
      command: experiment.command,
      gpuCount: experiment.resources?.gpuCount || 1,
      gpuMemory: experiment.resources?.gpuMemory || 16,
      cpuCores: experiment.resources?.cpuCores || 4,
      ramSize: experiment.resources?.ramSize || 32,
      storageSize: experiment.resources?.storageSize || 50,
      scheduledStartTime: experiment.timing?.scheduledStartTime || '',
      estimatedDuration: experiment.timing?.estimatedDuration || 120,
      maxRuntime: experiment.timing?.maxRuntime || 480,
      priority: experiment.priority || 'normal',
      environment: experiment.environment?.variables?.map(v => `${v.key}=${v.value}`).join('\n') || '',
      datasetPath: experiment.environment?.datasetPath || '',
      outputPath: experiment.environment?.outputPath || ''
    });
    setFormTab(0);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedExperiment(null);
    setFormTab(0);
    setFormData({
      name: '',
      description: '',
      projectId: '',
      image: '',
      command: '',
      gpuCount: 1,
      gpuMemory: 16,
      cpuCores: 4,
      ramSize: 32,
      storageSize: 50,
      scheduledStartTime: '',
      estimatedDuration: 120,
      maxRuntime: 480,
      priority: 'normal',
      environment: '',
      datasetPath: '',
      outputPath: ''
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} 分鐘`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`;
  };

  const getStatusColor = (status) => {
    const colors = { running: 'primary', scheduled: 'info', completed: 'success', failed: 'error', stopped: 'default', queued: 'warning' };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = { running: '執行中', scheduled: '已排程', completed: '已完成', failed: '失敗', stopped: '已停止', queued: '排隊中' };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = { high: 'error', normal: 'primary', low: 'default' };
    return colors[priority] || 'default';
  };

  const getPriorityLabel = (priority) => {
    const labels = { high: '高', normal: '中', low: '低' };
    return labels[priority] || priority;
  };

  const runningCount = experiments.filter(e => e.status === 'running').length;
  const scheduledCount = experiments.filter(e => e.status === 'scheduled' || e.status === 'queued').length;
  const completedCount = experiments.filter(e => e.status === 'completed').length;
  const totalGpuUsed = experiments.filter(e => e.status === 'running').reduce((acc, e) => acc + (e.resources?.gpuCount || 0), 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>實驗排程</Typography>
          <Typography variant="body2" color="text.secondary">
            在專案中申請 GPU 資源進行實驗排程
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadExperiments}>
            重新整理
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>
            新增實驗
          </Button>
        </Stack>
      </Stack>

      {/* 統計卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PlayArrowIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>{runningCount}</Typography>
              <Typography variant="caption" color="text.secondary">執行中</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ScheduleIcon color="info" sx={{ fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>{scheduledCount}</Typography>
              <Typography variant="caption" color="text.secondary">待執行</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ScienceIcon color="success" sx={{ fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>{completedCount}</Typography>
              <Typography variant="caption" color="text.secondary">已完成</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <MemoryIcon color="secondary" sx={{ fontSize: 28 }} />
              <Typography variant="h5" fontWeight={700}>{totalGpuUsed}</Typography>
              <Typography variant="caption" color="text.secondary">使用中 GPU</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>實驗名稱</TableCell>
                <TableCell>所屬專案</TableCell>
                <TableCell align="center">資源</TableCell>
                <TableCell align="center">優先權</TableCell>
                <TableCell align="center">狀態</TableCell>
                <TableCell align="center">進度</TableCell>
                <TableCell>執行者</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {experiments.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{exp.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {exp.description?.length > 30 ? exp.description.substring(0, 30) + '...' : exp.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{exp.project?.name}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" icon={<MemoryIcon />} label={`${exp.resources?.gpuCount} GPU`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={getPriorityLabel(exp.priority)} color={getPriorityColor(exp.priority)} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={getStatusLabel(exp.status)} color={getStatusColor(exp.status)} />
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 100 }}>
                    {exp.status === 'running' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={exp.progress} sx={{ flex: 1 }} />
                        <Typography variant="caption">{exp.progress}%</Typography>
                      </Box>
                    )}
                    {exp.status === 'completed' && <Typography variant="body2">100%</Typography>}
                    {exp.status === 'scheduled' && <Typography variant="caption" color="text.secondary">待開始</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{exp.user?.name}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看詳情">
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(exp)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="查看日誌">
                        <IconButton size="small" onClick={() => handleViewLogs(exp)}>
                          <TerminalIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {exp.status === 'scheduled' && (
                        <>
                          <Tooltip title="編輯">
                            <IconButton size="small" onClick={() => handleEditExperiment(exp)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="立即執行">
                            <IconButton size="small" color="success" onClick={() => handleStartExperiment(exp.id)}>
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {exp.status === 'running' && (
                        <Tooltip title="停止">
                          <IconButton size="small" color="error" onClick={() => handleStopExperiment(exp.id)}>
                            <StopIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {exp.status !== 'running' && (
                        <Tooltip title="刪除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteExperiment(exp.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新增/編輯實驗對話框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScienceIcon color="primary" />
            <span>{selectedExperiment ? '編輯實驗' : '新增實驗'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={formTab} onChange={(e, v) => setFormTab(v)}>
              <Tab label="基本資訊" />
              <Tab label="資源配置" />
              <Tab label="排程設定" />
              <Tab label="資料路徑" />
            </Tabs>
          </Box>

          {formTab === 0 && (
            <Stack spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>所屬專案 (GPU)</InputLabel>
                <Select
                  value={formData.projectId}
                  label="所屬專案 (GPU)"
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                >
                  {getProjects().map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} (可用 MIG: {p.resources.gpuQuota - p.resources.gpuUsed}/{p.resources.gpuQuota})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* 顯示所選專案的配額資訊 */}
              {formData.projectId && getSelectedProjectResources() && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50' }}>
                  <Typography variant="subtitle2" color="info.main" gutterBottom>
                    專案配額限制
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">可用 GPU</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {getSelectedProjectResources().availableGpu} / {getSelectedProjectResources().gpuQuota} 張
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">可用儲存空間</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {getSelectedProjectResources().availableStorage} / {getSelectedProjectResources().storageQuota} GB
                      </Typography>
                    </Grid>
                  </Grid>
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                    <Typography variant="caption">
                      實驗資源配置不得超過專案可用配額
                    </Typography>
                  </Alert>
                </Paper>
              )}

              <TextField
                label="實驗名稱"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="描述"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                label="Docker 映像檔"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                fullWidth
                placeholder="pytorch/pytorch:2.0-cuda11.7"
                required
              />
              <TextField
                label="執行命令"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                fullWidth
                multiline
                rows={2}
                required
              />
              <FormControl fullWidth>
                <InputLabel>優先權</InputLabel>
                <Select
                  value={formData.priority}
                  label="優先權"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="high">高 - 優先執行</MenuItem>
                  <MenuItem value="normal">中 - 正常排隊</MenuItem>
                  <MenuItem value="low">低 - 延後執行</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {formTab === 1 && (
            <Stack spacing={2}>
              {/* 資源驗證錯誤提示 */}
              {!resourceValidation.valid && (
                <Alert severity="error">
                  <Typography variant="subtitle2">資源配置超過專案配額：</Typography>
                  {resourceValidation.errors.map((err, idx) => (
                    <Typography key={idx} variant="body2">• {err}</Typography>
                  ))}
                </Alert>
              )}
              
              {formData.projectId && getSelectedProjectResources() && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary">
                    專案可用配額：GPU {getSelectedProjectResources().availableGpu} 張、儲存空間 {getSelectedProjectResources().availableStorage} GB
                  </Typography>
                </Paper>
              )}

              <Typography variant="subtitle2" color="text.secondary">GPU 資源</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="GPU 數量"
                    type="number"
                    value={formData.gpuCount}
                    onChange={(e) => setFormData({ ...formData, gpuCount: parseInt(e.target.value) || 0 })}
                    fullWidth
                    inputProps={{ min: 1, max: getSelectedProjectResources()?.availableGpu || 8 }}
                    error={formData.gpuCount > (getSelectedProjectResources()?.availableGpu || 999)}
                    helperText={formData.gpuCount > (getSelectedProjectResources()?.availableGpu || 999) ? '超過專案可用配額' : ''}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="GPU 記憶體 (GB)"
                    type="number"
                    value={formData.gpuMemory}
                    onChange={(e) => setFormData({ ...formData, gpuMemory: parseInt(e.target.value) || 0 })}
                    fullWidth
                    inputProps={{ min: 8, max: 80 }}
                  />
                </Grid>
              </Grid>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">CPU 與記憶體</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="CPU 核心數"
                    type="number"
                    value={formData.cpuCores}
                    onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value) || 0 })}
                    fullWidth
                    inputProps={{ min: 1, max: 64 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="RAM (GB)"
                    type="number"
                    value={formData.ramSize}
                    onChange={(e) => setFormData({ ...formData, ramSize: parseInt(e.target.value) || 0 })}
                    fullWidth
                    inputProps={{ min: 8, max: 512 }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="儲存空間 (GB)"
                type="number"
                value={formData.storageSize}
                onChange={(e) => setFormData({ ...formData, storageSize: parseInt(e.target.value) || 0 })}
                fullWidth
                inputProps={{ min: 10, max: getSelectedProjectResources()?.availableStorage || 500 }}
                error={formData.storageSize > (getSelectedProjectResources()?.availableStorage || 999)}
                helperText={formData.storageSize > (getSelectedProjectResources()?.availableStorage || 999) ? '超過專案可用配額' : ''}
              />
            </Stack>
          )}

          {formTab === 2 && (
            <Stack spacing={2}>
              <TextField
                label="預計開始時間"
                type="datetime-local"
                value={formData.scheduledStartTime}
                onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                helperText="留空則立即加入排隊"
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="預計執行時間 (分鐘)"
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 0 })}
                    fullWidth
                    helperText={formatDuration(formData.estimatedDuration)}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="最大執行時間 (分鐘)"
                    type="number"
                    value={formData.maxRuntime}
                    onChange={(e) => setFormData({ ...formData, maxRuntime: parseInt(e.target.value) || 0 })}
                    fullWidth
                    helperText={formatDuration(formData.maxRuntime)}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {formTab === 3 && (
            <Stack spacing={2}>
              <TextField
                label="資料集路徑"
                value={formData.datasetPath}
                onChange={(e) => setFormData({ ...formData, datasetPath: e.target.value })}
                fullWidth
                placeholder="/data/your-dataset"
              />
              <TextField
                label="輸出路徑"
                value={formData.outputPath}
                onChange={(e) => setFormData({ ...formData, outputPath: e.target.value })}
                fullWidth
                placeholder="/output/experiment-results"
              />
              <TextField
                label="環境變數"
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                fullWidth
                multiline
                rows={4}
                placeholder="KEY1=VALUE1&#10;KEY2=VALUE2"
                helperText="每行一個環境變數"
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={selectedExperiment ? handleUpdateExperiment : handleCreateExperiment}
            disabled={!formData.projectId || !formData.name || !formData.image || !formData.command || !resourceValidation.valid}
          >
            {selectedExperiment ? '更新' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 實驗詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <ScienceIcon color="primary" />
              <span>實驗詳情</span>
            </Stack>
            <Chip label={getStatusLabel(selectedExperiment?.status)} color={getStatusColor(selectedExperiment?.status)} />
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedExperiment && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>{selectedExperiment.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedExperiment.description}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">實驗 ID</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedExperiment.id}</Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedExperiment.id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">所屬專案</Typography>
                    <Typography variant="body2">{selectedExperiment.project?.name}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">執行者</Typography>
                    <Typography variant="body2">{selectedExperiment.user?.name}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">優先權</Typography>
                    <Chip size="small" label={getPriorityLabel(selectedExperiment.priority)} color={getPriorityColor(selectedExperiment.priority)} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>時間資訊</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計開始時間</Typography>
                    <Typography variant="body2" color="primary.main" fontWeight={500}>
                      {selectedExperiment.timing?.scheduledStartTime}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">實際開始時間</Typography>
                    <Typography variant="body2">{selectedExperiment.timing?.actualStartTime || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計結束時間</Typography>
                    <Typography variant="body2" color="secondary.main" fontWeight={500}>
                      {selectedExperiment.timing?.estimatedEndTime || '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計執行時間</Typography>
                    <Typography variant="body2">{formatDuration(selectedExperiment.timing?.estimatedDuration)}</Typography>
                  </Grid>
                  {selectedExperiment.status === 'running' && (
                    <>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary">已執行時間</Typography>
                        <Typography variant="body2">{formatDuration(selectedExperiment.timing?.elapsedTime)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={4}>
                        <Typography variant="caption" color="text.secondary">剩餘時間</Typography>
                        <Typography variant="body2" color="success.main">{formatDuration(selectedExperiment.timing?.remainingTime)}</Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
                {selectedExperiment.status === 'running' && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>進度: {selectedExperiment.progress}%</Typography>
                    <LinearProgress variant="determinate" value={selectedExperiment.progress} sx={{ height: 10, borderRadius: 5 }} />
                  </Box>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>資源配置</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={4} md={2}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={600}>{selectedExperiment.resources?.gpuCount}</Typography>
                      <Typography variant="caption" color="text.secondary">GPU</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={600}>{selectedExperiment.resources?.gpuMemory}</Typography>
                      <Typography variant="caption" color="text.secondary">GPU GB</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={600}>{selectedExperiment.resources?.cpuCores}</Typography>
                      <Typography variant="caption" color="text.secondary">CPU</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={600}>{selectedExperiment.resources?.ramSize}</Typography>
                      <Typography variant="caption" color="text.secondary">RAM GB</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Card variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={600}>{selectedExperiment.resources?.storageSize}</Typography>
                      <Typography variant="caption" color="text.secondary">Storage GB</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>

              {selectedExperiment.results && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>實驗結果</Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    {Object.entries(selectedExperiment.results).map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${Array.isArray(value) ? value.length + ' items' : value}`}
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleViewLogs(selectedExperiment)} startIcon={<TerminalIcon />}>查看日誌</Button>
          <Button variant="contained" onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 日誌對話框 */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TerminalIcon />
            <span>實驗日誌 - {selectedExperiment?.name}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
            {experimentLogs || '暫無日誌'}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(experimentLogs)} startIcon={<ContentCopyIcon />}>複製日誌</Button>
          <Button onClick={() => setLogDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExperimentScheduling;
