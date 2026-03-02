import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TimelineIcon from '@mui/icons-material/Timeline';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import BoltIcon from '@mui/icons-material/Bolt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import {
  fetchGrafanaDashboards,
  fetchGrafanaPanels,
  fetchPrometheusMetrics
} from '../../services/adminApi';
import { getGpuMetrics, listContainers } from '../../services/connectorApi';

const GrafanaMonitor = () => {
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('1h');
  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [dashboards, setDashboards] = useState([]);
  const [metrics, setMetrics] = useState({});

  // 模擬 Grafana 儀表板資料
  const mockDashboards = [
    {
      id: 'gpu-overview',
      title: 'GPU 總覽',
      description: '所有 GPU 的即時狀態與使用率',
      panels: 6
    },
    {
      id: 'gpu-memory',
      title: 'GPU 記憶體',
      description: 'GPU 記憶體使用情況詳細分析',
      panels: 4
    },
    {
      id: 'gpu-temperature',
      title: 'GPU 溫度監控',
      description: 'GPU 溫度趨勢與警報',
      panels: 3
    },
    {
      id: 'container-metrics',
      title: '容器監控',
      description: '運行中容器的資源使用情況',
      panels: 5
    }
  ];

  // 模擬 Prometheus 指標資料 (作為備用)
  const mockMetrics = {
    gpuUtilization: [
      { gpu: 'GPU-0', value: 0, trend: [0, 0, 0, 0, 0, 0] },
      { gpu: 'GPU-1', value: 0, trend: [0, 0, 0, 0, 0, 0] },
      { gpu: 'GPU-2', value: 0, trend: [0, 0, 0, 0, 0, 0] },
      { gpu: 'GPU-3', value: 0, trend: [0, 0, 0, 0, 0, 0] }
    ],
    gpuMemory: [
      { gpu: 'GPU-0', used: 0, total: 81920 },
      { gpu: 'GPU-1', used: 0, total: 81920 },
      { gpu: 'GPU-2', used: 0, total: 81920 },
      { gpu: 'GPU-3', used: 0, total: 81920 }
    ],
    gpuTemperature: [
      { gpu: 'GPU-0', value: 0, max: 83 },
      { gpu: 'GPU-1', value: 0, max: 83 },
      { gpu: 'GPU-2', value: 0, max: 83 },
      { gpu: 'GPU-3', value: 0, max: 83 }
    ],
    gpuPower: [
      { gpu: 'GPU-0', current: 0, max: 400 },
      { gpu: 'GPU-1', current: 0, max: 400 },
      { gpu: 'GPU-2', current: 0, max: 400 },
      { gpu: 'GPU-3', current: 0, max: 400 }
    ],
    systemStats: {
      totalGpus: 4,
      activeGpus: 0,
      totalMemory: 327680,
      usedMemory: 0,
      runningContainers: 0,
      queuedJobs: 0
    }
  };

  // 歷史數據追蹤 (用於趨勢圖)
  const [metricsHistory, setMetricsHistory] = useState({
    0: [], 1: [], 2: [], 3: []
  });

  useEffect(() => {
    loadData();
    // 定期刷新數據
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 取得真實 GPU 指標
      const gpuMetricsRes = await getGpuMetrics();
      const gpus = gpuMetricsRes.gpus || [];
      const summary = gpuMetricsRes.summary || {};
      
      // 更新歷史數據用於趨勢圖
      setMetricsHistory(prev => {
        const newHistory = { ...prev };
        gpus.forEach(gpu => {
          const history = newHistory[gpu.index] || [];
          history.push(gpu.utilization);
          if (history.length > 6) history.shift();
          newHistory[gpu.index] = history;
        });
        return newHistory;
      });

      // 轉換為前端格式
      const realMetrics = {
        gpuUtilization: gpus.map(gpu => ({
          gpu: `GPU-${gpu.index}`,
          value: gpu.utilization,
          trend: metricsHistory[gpu.index]?.length > 0 
            ? [...metricsHistory[gpu.index], gpu.utilization].slice(-6) 
            : [gpu.utilization, gpu.utilization, gpu.utilization, gpu.utilization, gpu.utilization, gpu.utilization]
        })),
        gpuMemory: gpus.map(gpu => ({
          gpu: `GPU-${gpu.index}`,
          used: gpu.memory?.used || 0,
          total: gpu.memory?.total || 81920
        })),
        gpuTemperature: gpus.map(gpu => ({
          gpu: `GPU-${gpu.index}`,
          value: gpu.temperature || 0,
          max: 83
        })),
        gpuPower: gpus.map(gpu => ({
          gpu: `GPU-${gpu.index}`,
          current: gpu.power?.draw || 0,
          max: gpu.power?.limit || 400
        })),
        systemStats: {
          totalGpus: summary.total_gpus || gpus.length,
          activeGpus: summary.active_gpus || 0,
          totalMemory: summary.total_memory || 327680,
          usedMemory: summary.total_memory_used || 0,
          runningContainers: summary.running_containers || 0,
          queuedJobs: 0
        }
      };
      
      setDashboards(mockDashboards);
      setMetrics(realMetrics);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      // 發生錯誤時使用 mock 數據
      setDashboards(mockDashboards);
      setMetrics(mockMetrics);
    }
    setLoading(false);
  };

  const openGrafana = (dashboardId) => {
    // 實際應用中會開啟 Grafana 頁面
    window.open(`http://grafana.example.com/d/${dashboardId}`, '_blank');
  };

  const getUtilizationColor = (value) => {
    if (value > 90) return 'error';
    if (value > 70) return 'warning';
    return 'primary';
  };

  const getTemperatureColor = (value, max) => {
    const ratio = value / max;
    if (ratio > 0.95) return '#f44336';
    if (ratio > 0.85) return '#ff9800';
    if (ratio > 0.70) return '#ffeb3b';
    return '#4caf50';
  };

  const formatMemory = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  // 簡易圖表元件 - 模擬趨勢線
  const TrendLine = ({ data, color = '#2196f3', height = 40 }) => {
    const max = Math.max(...data, 1);
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (v / max) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            可視化與監控
          </Typography>
          <Typography variant="body2" color="text.secondary">
            整合 Prometheus 數據存儲與 Grafana 可視化儀表板
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>時間範圍</InputLabel>
            <Select
              value={timeRange}
              label="時間範圍"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="15m">過去 15 分鐘</MenuItem>
              <MenuItem value="1h">過去 1 小時</MenuItem>
              <MenuItem value="6h">過去 6 小時</MenuItem>
              <MenuItem value="24h">過去 24 小時</MenuItem>
              <MenuItem value="7d">過去 7 天</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>刷新間隔</InputLabel>
            <Select
              value={refreshInterval}
              label="刷新間隔"
              onChange={(e) => setRefreshInterval(e.target.value)}
            >
              <MenuItem value="off">關閉</MenuItem>
              <MenuItem value="10s">10 秒</MenuItem>
              <MenuItem value="30s">30 秒</MenuItem>
              <MenuItem value="1m">1 分鐘</MenuItem>
              <MenuItem value="5m">5 分鐘</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => openGrafana('gpu-overview')}
          >
            開啟 Grafana
          </Button>
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="即時監控" />
          <Tab icon={<TimelineIcon />} iconPosition="start" label="儀表板清單" />
        </Tabs>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : currentTab === 0 ? (
        // 即時監控面板
        <Box>
          {/* 系統摘要 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="h5" fontWeight={600}>
                    {metrics.systemStats?.totalGpus}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    GPU 總數
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <SpeedIcon color="success" />
                  <Typography variant="h5" fontWeight={600}>
                    {metrics.systemStats?.activeGpus}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    運作中 GPU
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <StorageIcon color="info" />
                  <Typography variant="h5" fontWeight={600}>
                    {((metrics.systemStats?.usedMemory / metrics.systemStats?.totalMemory) * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    記憶體使用率
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <BoltIcon color="warning" />
                  <Typography variant="h5" fontWeight={600}>
                    {metrics.gpuPower?.reduce((sum, g) => sum + g.current, 0)}W
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    總功耗
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <DashboardIcon color="secondary" />
                  <Typography variant="h5" fontWeight={600}>
                    {metrics.systemStats?.runningContainers}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    運行容器
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <TimelineIcon color="error" />
                  <Typography variant="h5" fontWeight={600}>
                    {metrics.systemStats?.queuedJobs}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    排隊任務
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* GPU 使用率面板 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            <SpeedIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            GPU 使用率
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {metrics.gpuUtilization?.map((gpu, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {gpu.gpu}
                    </Typography>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      color={getUtilizationColor(gpu.value) + '.main'}
                    >
                      {gpu.value}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={gpu.value}
                    color={getUtilizationColor(gpu.value)}
                    sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  />
                  <Box sx={{ height: 40 }}>
                    <TrendLine
                      data={gpu.trend}
                      color={
                        gpu.value > 90 ? '#f44336' :
                        gpu.value > 70 ? '#ff9800' : '#2196f3'
                      }
                    />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* GPU 記憶體面板 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            <StorageIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            GPU 記憶體使用
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {metrics.gpuMemory?.map((gpu, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {gpu.gpu}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatMemory(gpu.used)} / {formatMemory(gpu.total)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(gpu.used / gpu.total) * 100}
                    color={gpu.used / gpu.total > 0.9 ? 'error' : gpu.used / gpu.total > 0.7 ? 'warning' : 'primary'}
                    sx={{ height: 20, borderRadius: 2 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* GPU 溫度與功耗 */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                <ThermostatIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                GPU 溫度
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  {metrics.gpuTemperature?.map((gpu, index) => (
                    <Box key={index}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{gpu.gpu}</Typography>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ color: getTemperatureColor(gpu.value, gpu.max) }}
                        >
                          {gpu.value}°C / {gpu.max}°C
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(gpu.value / gpu.max) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getTemperatureColor(gpu.value, gpu.max)
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                <BoltIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                GPU 功耗
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  {metrics.gpuPower?.map((gpu, index) => (
                    <Box key={index}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{gpu.gpu}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {gpu.current}W / {gpu.max}W
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(gpu.current / gpu.max) * 100}
                        color={gpu.current / gpu.max > 0.9 ? 'error' : 'warning'}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      ) : (
        // 儀表板清單
        <Grid container spacing={2}>
          {dashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {dashboard.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {dashboard.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dashboard.panels} 個面板
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="全螢幕開啟">
                        <IconButton size="small" onClick={() => openGrafana(dashboard.id)}>
                          <FullscreenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="新分頁開啟">
                        <IconButton size="small" onClick={() => openGrafana(dashboard.id)}>
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          此頁面整合 <strong>Prometheus</strong> 進行數據收集與儲存，並透過 <strong>Grafana</strong> 提供可視化儀表板。
          點擊「開啟 Grafana」按鈕可進入完整的監控介面。
        </Typography>
      </Alert>
    </Box>
  );
};

export default GrafanaMonitor;
