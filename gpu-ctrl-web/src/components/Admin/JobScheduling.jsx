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
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TerminalIcon from '@mui/icons-material/Terminal';
import SpeedIcon from '@mui/icons-material/Speed';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer,
  getConnectionStatus
} from '../../services/connectorApi';

const JobScheduling = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobLogs, setJobLogs] = useState('');
  const [formTab, setFormTab] = useState(0);
  const [connected, setConnected] = useState(false);
  const [migInfo, setMigInfo] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: 'ssh-nvidia:latest',
    command: '',
    gpuId: 0,
    gpuCount: 1,
    gpuMemory: 10,
    cpuCores: 4,
    ramSize: 32,
    storageSize: 100,
    priority: 'normal',
    scheduledStartTime: '',
    estimatedDuration: 60,
    maxRuntime: 480,
    notifyOnComplete: true,
    autoRetry: false,
    retryCount: 0,
    environment: '',
    workingDirectory: '/workspace',
    outputPath: '/output'
  });

  // H200 GPU 配置
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10;

  useEffect(() => {
    checkConnection();
    loadJobs();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected || false);
    } catch {
      setConnected(false);
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      setMigInfo(migData.mig_info || {});
      const containers = containerData.containers || [];

      // 將容器轉換為任務
      const jobList = containers.map((container, idx) => {
        const port = container.ports?.[0]?.host_port || 0;
        const gpuId = Math.floor(port / 10000);
        const isRunning = container.status?.includes('Up');

        return {
          id: container.id,
          name: `任務 ${idx + 1} - GPU ${gpuId}`,
          description: `運行於 ${GPU_NAME} GPU ${gpuId}，使用 MIG 分區`,
          image: container.image || 'ssh-nvidia:latest',
          command: container.command || '',
          gpuId: gpuId,
          resources: {
            gpuCount: 1,
            gpuType: GPU_NAME,
            gpuMemory: MIG_MEMORY,
            cpuCores: 4,
            ramSize: 32,
            storageSize: 50
          },
          timing: {
            createdAt: container.created || new Date().toISOString(),
            scheduledStartTime: null,
            actualStartTime: container.created,
            estimatedEndTime: null,
            estimatedDuration: 480,
            maxRuntime: 720,
            elapsedTime: 0,
            remainingTime: null
          },
          priority: 'normal',
          status: isRunning ? 'running' : 'stopped',
          progress: isRunning ? 50 : 0,
          port: port,
          sshCommand: `ssh root@10.133.77.231 -p ${port}`,
          user: 'user001',
          userEmail: 'user@nkust.edu.tw',
          environment: {
            variables: [],
            workingDirectory: '/workspace',
            outputPath: '/output',
            dataPath: '/data'
          },
          outputs: {
            checkpointPath: '/output/checkpoints',
            logPath: '/output/logs',
            lastCheckpoint: null,
            metrics: null
          },
          settings: {
            notifyOnComplete: false,
            autoRetry: false,
            retryCount: 0,
            retryDelay: 0
          },
          queuePosition: null
        };
      });

      setJobs(jobList);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
    setLoading(false);
  };

  const handleCreateJob = async () => {
    try {
      await startContainer(formData.gpuId, formData.gpuCount, formData.image);
      setDialogOpen(false);
      resetForm();
      loadJobs();
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  const handleUpdateJob = async () => {
    setDialogOpen(false);
    resetForm();
    loadJobs();
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('確定要刪除此任務嗎？這將停止相關容器。')) {
      try {
        await stopContainer(jobId);
        loadJobs();
      } catch (error) {
        console.error('Failed to delete job:', error);
      }
    }
  };

  const handleStartJob = async (jobId) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        await startContainer(job.gpuId, 1, job.image);
      }
      loadJobs();
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  const handleStopJob = async (jobId) => {
    try {
      await stopContainer(jobId);
      loadJobs();
    } catch (error) {
      console.error('Failed to stop job:', error);
    }
  };

  const handleViewDetails = async (job) => {
    setSelectedJob(job);
    setDetailDialogOpen(true);
  };

  const handleViewLogs = async (job) => {
    try {
      setSelectedJob(job);
      setJobLogs(generateMockLogs(job));
      setLogDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch job logs:', error);
    }
  };

  const generateMockLogs = (job) => {
    const baseTime = job.timing?.actualStartTime || job.timing?.createdAt || '2026-01-25 09:00:00';
    return `[${baseTime}] ========================================
[${baseTime}] Job ID: ${job.id}
[${baseTime}] Job Name: ${job.name}
[${baseTime}] ========================================
[${baseTime}] Initializing container with image: ${job.image}
[${baseTime}] Mounting volumes...
[${baseTime}]   - /workspace -> ${job.environment?.workingDirectory || '/workspace'}
[${baseTime}]   - /output -> ${job.environment?.outputPath || '/output'}
[${baseTime}] Setting environment variables...
${job.environment?.variables?.map(v => `[${baseTime}]   - ${v.key}=${v.value}`).join('\n') || ''}
[${baseTime}] Starting execution...
[${baseTime}] Command: ${job.command}
[${baseTime}] ----------------------------------------
[${baseTime}] GPU allocated: ${job.resources?.gpuCount || 0} x ${job.resources?.gpuType || 'N/A'}
[${baseTime}] Memory allocated: ${job.resources?.ramSize || 0} GB RAM
[${baseTime}] ----------------------------------------
${job.status === 'running' ? `[${baseTime}] Training in progress...\n[${baseTime}] Current progress: ${job.progress}%` : ''}
${job.status === 'completed' ? `[${baseTime}] Job completed successfully!` : ''}
${job.status === 'failed' ? `[${baseTime}] ERROR: ${job.error?.message || 'Unknown error'}` : ''}`;
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setFormData({
      name: job.name,
      description: job.description,
      image: job.image,
      command: job.command,
      gpuCount: job.resources?.gpuCount || 0,
      gpuMemory: job.resources?.gpuMemory || 16,
      cpuCores: job.resources?.cpuCores || 4,
      ramSize: job.resources?.ramSize || 32,
      storageSize: job.resources?.storageSize || 100,
      priority: job.priority,
      scheduledStartTime: job.timing?.scheduledStartTime || '',
      estimatedDuration: job.timing?.estimatedDuration || 60,
      maxRuntime: job.timing?.maxRuntime || 480,
      notifyOnComplete: job.settings?.notifyOnComplete ?? true,
      autoRetry: job.settings?.autoRetry ?? false,
      retryCount: job.settings?.retryCount || 0,
      environment: job.environment?.variables?.map(v => `${v.key}=${v.value}`).join('\n') || '',
      workingDirectory: job.environment?.workingDirectory || '/workspace',
      outputPath: job.environment?.outputPath || '/output'
    });
    setFormTab(0);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedJob(null);
    setFormTab(0);
    setFormData({
      name: '',
      description: '',
      image: '',
      command: '',
      gpuCount: 1,
      gpuMemory: 16,
      cpuCores: 4,
      ramSize: 32,
      storageSize: 100,
      priority: 'normal',
      scheduledStartTime: '',
      estimatedDuration: 60,
      maxRuntime: 480,
      notifyOnComplete: true,
      autoRetry: false,
      retryCount: 0,
      environment: '',
      workingDirectory: '/workspace',
      outputPath: '/output'
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
    const colors = { running: 'primary', queued: 'warning', completed: 'success', failed: 'error', scheduled: 'info', stopped: 'default' };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = { running: '執行中', queued: '排隊中', completed: '已完成', failed: '失敗', scheduled: '已排程', stopped: '已停止' };
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

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>任務排程管理</Typography>
          <Typography variant="body2" color="text.secondary">管理 GPU 計算任務的排程與執行</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadJobs}>重新整理</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>新增任務</Button>
        </Stack>
      </Stack>

      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>任務名稱</TableCell>
                <TableCell>映像檔</TableCell>
                <TableCell align="center">資源需求</TableCell>
                <TableCell align="center">優先權</TableCell>
                <TableCell align="center">狀態</TableCell>
                <TableCell align="center">進度</TableCell>
                <TableCell>使用者</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{job.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {job.description?.length > 40 ? job.description.substring(0, 40) + '...' : job.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {job.image?.length > 30 ? job.image.substring(0, 30) + '...' : job.image}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Chip size="small" icon={<MemoryIcon />} label={`${job.resources?.gpuCount || 0} GPU`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      <Chip size="small" label={`${job.resources?.ramSize || 0}GB`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={getPriorityLabel(job.priority)} color={getPriorityColor(job.priority)} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={getStatusLabel(job.status)} color={getStatusColor(job.status)} />
                  </TableCell>
                  <TableCell align="center" sx={{ minWidth: 120 }}>
                    {job.status === 'running' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={job.progress} sx={{ flex: 1 }} />
                        <Typography variant="caption">{job.progress}%</Typography>
                      </Box>
                    )}
                    {job.status === 'completed' && '100%'}
                    {job.status === 'failed' && `${job.progress}%`}
                    {job.status === 'queued' && job.queuePosition && (
                      <Typography variant="caption" color="text.secondary">排隊第 {job.queuePosition} 位</Typography>
                    )}
                  </TableCell>
                  <TableCell>{job.user}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看詳情">
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(job)}><InfoIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="查看日誌">
                        <IconButton size="small" onClick={() => handleViewLogs(job)}><TerminalIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      {(job.status === 'queued' || job.status === 'scheduled') && (
                        <>
                          <Tooltip title="編輯"><IconButton size="small" onClick={() => handleEditJob(job)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="立即執行"><IconButton size="small" color="success" onClick={() => handleStartJob(job.id)}><PlayArrowIcon fontSize="small" /></IconButton></Tooltip>
                        </>
                      )}
                      {job.status === 'running' && (
                        <Tooltip title="停止"><IconButton size="small" color="error" onClick={() => handleStopJob(job.id)}><StopIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                      {job.status !== 'running' && (
                        <Tooltip title="刪除"><IconButton size="small" color="error" onClick={() => handleDeleteJob(job.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新增/編輯任務對話框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScheduleIcon />
            <span>{selectedJob ? '編輯任務' : '新增任務'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={formTab} onChange={(e, v) => setFormTab(v)}>
              <Tab label="基本資訊" />
              <Tab label="資源配置" />
              <Tab label="時間設定" />
              <Tab label="環境變數" />
            </Tabs>
          </Box>

          {formTab === 0 && (
            <Stack spacing={2}>
              <TextField label="任務名稱" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth required />
              <TextField label="描述" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} fullWidth multiline rows={2} />
              <TextField label="Docker 映像檔" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} fullWidth placeholder="例如: pytorch/pytorch:2.0-cuda11.7" required />
              <TextField label="執行命令" value={formData.command} onChange={(e) => setFormData({ ...formData, command: e.target.value })} fullWidth placeholder="例如: python train.py --epochs 100" required multiline rows={2} />
              <FormControl fullWidth>
                <InputLabel>優先權</InputLabel>
                <Select value={formData.priority} label="優先權" onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="high">高 - 優先執行</MenuItem>
                  <MenuItem value="normal">中 - 正常排隊</MenuItem>
                  <MenuItem value="low">低 - 延後執行</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          )}

          {formTab === 1 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">GPU 資源</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}><TextField label="GPU 數量" type="number" value={formData.gpuCount} onChange={(e) => setFormData({ ...formData, gpuCount: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 0, max: 8 }} /></Grid>
                <Grid item xs={6}><TextField label="GPU 記憶體 (GB)" type="number" value={formData.gpuMemory} onChange={(e) => setFormData({ ...formData, gpuMemory: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 0, max: 80 }} /></Grid>
              </Grid>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">CPU 與記憶體</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}><TextField label="CPU 核心數" type="number" value={formData.cpuCores} onChange={(e) => setFormData({ ...formData, cpuCores: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 1, max: 64 }} /></Grid>
                <Grid item xs={6}><TextField label="RAM (GB)" type="number" value={formData.ramSize} onChange={(e) => setFormData({ ...formData, ramSize: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 1, max: 512 }} /></Grid>
              </Grid>
              <Divider />
              <TextField label="儲存空間 (GB)" type="number" value={formData.storageSize} onChange={(e) => setFormData({ ...formData, storageSize: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 10, max: 1000 }} helperText="任務執行所需的臨時儲存空間" />
            </Stack>
          )}

          {formTab === 2 && (
            <Stack spacing={2}>
              <TextField label="預計開始時間" type="datetime-local" value={formData.scheduledStartTime} onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth helperText="留空則立即加入排隊" />
              <Grid container spacing={2}>
                <Grid item xs={6}><TextField label="預計執行時間 (分鐘)" type="number" value={formData.estimatedDuration} onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 1 }} helperText={`約 ${formatDuration(formData.estimatedDuration)}`} /></Grid>
                <Grid item xs={6}><TextField label="最大執行時間 (分鐘)" type="number" value={formData.maxRuntime} onChange={(e) => setFormData({ ...formData, maxRuntime: parseInt(e.target.value) || 0 })} fullWidth inputProps={{ min: 1 }} helperText={`約 ${formatDuration(formData.maxRuntime)}`} /></Grid>
              </Grid>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">任務設定</Typography>
              <Stack direction="row" spacing={2}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>完成時通知</InputLabel>
                  <Select value={formData.notifyOnComplete ? 'yes' : 'no'} label="完成時通知" onChange={(e) => setFormData({ ...formData, notifyOnComplete: e.target.value === 'yes' })}>
                    <MenuItem value="yes">是</MenuItem>
                    <MenuItem value="no">否</MenuItem>
                  </Select>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>失敗自動重試</InputLabel>
                  <Select value={formData.autoRetry ? 'yes' : 'no'} label="失敗自動重試" onChange={(e) => setFormData({ ...formData, autoRetry: e.target.value === 'yes' })}>
                    <MenuItem value="yes">是</MenuItem>
                    <MenuItem value="no">否</MenuItem>
                  </Select>
                </FormControl>
                {formData.autoRetry && <TextField label="重試次數" type="number" value={formData.retryCount} onChange={(e) => setFormData({ ...formData, retryCount: parseInt(e.target.value) || 0 })} inputProps={{ min: 1, max: 10 }} sx={{ width: 120 }} />}
              </Stack>
            </Stack>
          )}

          {formTab === 3 && (
            <Stack spacing={2}>
              <TextField label="工作目錄" value={formData.workingDirectory} onChange={(e) => setFormData({ ...formData, workingDirectory: e.target.value })} fullWidth placeholder="/workspace" />
              <TextField label="輸出目錄" value={formData.outputPath} onChange={(e) => setFormData({ ...formData, outputPath: e.target.value })} fullWidth placeholder="/output" />
              <TextField label="環境變數" value={formData.environment} onChange={(e) => setFormData({ ...formData, environment: e.target.value })} fullWidth multiline rows={4} placeholder="KEY1=VALUE1&#10;KEY2=VALUE2" helperText="每行一個環境變數，格式為 KEY=VALUE" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={selectedJob ? handleUpdateJob : handleCreateJob} disabled={!formData.name || !formData.image || !formData.command}>
            {selectedJob ? '更新' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 任務詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <InfoIcon color="primary" />
              <span>任務詳情</span>
            </Stack>
            <Chip label={getStatusLabel(selectedJob?.status)} color={getStatusColor(selectedJob?.status)} />
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedJob && (
            <Box>
              {/* 基本資訊 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>{selectedJob.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selectedJob.description}</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">任務 ID</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.id}</Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedJob.id)}><ContentCopyIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">使用者</Typography>
                    <Typography variant="body2">{selectedJob.user}</Typography>
                    <Typography variant="caption" color="text.secondary">{selectedJob.userEmail}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">優先權</Typography>
                    <Box><Chip size="small" label={getPriorityLabel(selectedJob.priority)} color={getPriorityColor(selectedJob.priority)} /></Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">進度</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={selectedJob.progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="body2">{selectedJob.progress}%</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* 時間資訊 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>時間資訊</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">建立時間</Typography>
                    <Typography variant="body2">{selectedJob.timing?.createdAt || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計開始時間</Typography>
                    <Typography variant="body2" fontWeight={500} color="primary.main">{selectedJob.timing?.scheduledStartTime || '立即執行'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">實際開始時間</Typography>
                    <Typography variant="body2">{selectedJob.timing?.actualStartTime || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計結束時間</Typography>
                    <Typography variant="body2" fontWeight={500} color="secondary.main">{selectedJob.timing?.estimatedEndTime || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">預計執行時間</Typography>
                    <Typography variant="body2">{formatDuration(selectedJob.timing?.estimatedDuration)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Typography variant="caption" color="text.secondary">最大執行時間</Typography>
                    <Typography variant="body2">{formatDuration(selectedJob.timing?.maxRuntime)}</Typography>
                  </Grid>
                  {selectedJob.status === 'running' && (
                    <>
                      <Grid item xs={6} md={6}>
                        <Typography variant="caption" color="text.secondary">已執行時間</Typography>
                        <Typography variant="body2" color="warning.main">{formatDuration(selectedJob.timing?.elapsedTime)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={6}>
                        <Typography variant="caption" color="text.secondary">預計剩餘時間</Typography>
                        <Typography variant="body2" color="success.main">{formatDuration(selectedJob.timing?.remainingTime)}</Typography>
                      </Grid>
                    </>
                  )}
                  {selectedJob.timing?.actualEndTime && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">實際結束時間</Typography>
                      <Typography variant="body2">{selectedJob.timing.actualEndTime}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* 資源需求 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>資源需求</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={4}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <MemoryIcon color="primary" />
                      <Typography variant="h5" fontWeight={600}>{selectedJob.resources?.gpuCount || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">GPU 數量</Typography>
                      {selectedJob.resources?.gpuType && <Typography variant="caption" display="block" color="text.secondary">{selectedJob.resources.gpuType}</Typography>}
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <StorageIcon color="secondary" />
                      <Typography variant="h5" fontWeight={600}>{selectedJob.resources?.gpuMemory || 0} GB</Typography>
                      <Typography variant="caption" color="text.secondary">GPU 記憶體</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={4}>
                    <Card variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <SpeedIcon color="info" />
                      <Typography variant="h5" fontWeight={600}>{selectedJob.resources?.cpuCores || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">CPU 核心</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={6}>
                    <Typography variant="caption" color="text.secondary">系統記憶體 (RAM)</Typography>
                    <Typography variant="body2">{selectedJob.resources?.ramSize || 0} GB</Typography>
                  </Grid>
                  <Grid item xs={6} md={6}>
                    <Typography variant="caption" color="text.secondary">儲存空間</Typography>
                    <Typography variant="body2">{selectedJob.resources?.storageSize || 0} GB</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 執行環境 */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <TerminalIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>執行環境</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Docker 映像檔</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.image}</Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedJob.image)}><ContentCopyIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">執行命令</Typography>
                    <Paper sx={{ p: 1, bgcolor: 'action.hover', fontFamily: 'monospace', fontSize: '0.85rem' }}>{selectedJob.command}</Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">工作目錄</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.environment?.workingDirectory || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">輸出目錄</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.environment?.outputPath || '-'}</Typography>
                  </Grid>
                  {selectedJob.environment?.variables?.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>環境變數</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {selectedJob.environment.variables.map((v, i) => (
                          <Chip key={i} size="small" label={`${v.key}=${v.value}`} variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} />
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* 輸出與結果 */}
              {selectedJob.outputs && (selectedJob.outputs.metrics || selectedJob.outputs.lastCheckpoint) && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>輸出與結果</Typography>
                  <Grid container spacing={2}>
                    {selectedJob.outputs.checkpointPath && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">Checkpoint 路徑</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedJob.outputs.checkpointPath}</Typography>
                      </Grid>
                    )}
                    {selectedJob.outputs.lastCheckpoint && (
                      <Grid item xs={12} md={6}>
                        <Typography variant="caption" color="text.secondary">最後 Checkpoint</Typography>
                        <Typography variant="body2">{selectedJob.outputs.lastCheckpoint}</Typography>
                      </Grid>
                    )}
                    {selectedJob.outputs.metrics && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>指標</Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                          {Object.entries(selectedJob.outputs.metrics).map(([key, value]) => (
                            <Chip key={key} label={`${key}: ${value}`} color="primary" variant="outlined" />
                          ))}
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* 錯誤資訊 */}
              {selectedJob.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">錯誤: {selectedJob.error.code}</Typography>
                  <Typography variant="body2">{selectedJob.error.message}</Typography>
                  <Typography variant="caption" color="text.secondary">發生時間: {selectedJob.error.timestamp} | 已重試: {selectedJob.error.retryAttempts} 次</Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleViewLogs(selectedJob)} startIcon={<TerminalIcon />}>查看日誌</Button>
          {(selectedJob?.status === 'queued' || selectedJob?.status === 'scheduled') && (
            <Button variant="outlined" onClick={() => { setDetailDialogOpen(false); handleEditJob(selectedJob); }}>編輯</Button>
          )}
          <Button variant="contained" onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 日誌對話框 */}
      <Dialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TerminalIcon />
            <span>任務日誌 - {selectedJob?.name}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'grey.100', fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
            {jobLogs || '暫無日誌'}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => copyToClipboard(jobLogs)} startIcon={<ContentCopyIcon />}>複製日誌</Button>
          <Button onClick={() => setLogDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JobScheduling;
