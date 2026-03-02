import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
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
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import HelpOutline from '@mui/icons-material/HelpOutline';
import { 
  fetchSystemLogs, 
  fetchMonitoringStatus, 
  startMonitoringServices,
  startMonitoringStack 
} from '../../services/adminApi';

const SystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    level: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // 監控服務狀態
  const [monitoringStatus, setMonitoringStatus] = useState({
    containers: [
      { name: "monitoring_grafana_1", port: 3000, status: "unknown" },
      { name: "monitoring_loki_1", port: 3100, status: "unknown" },
      { name: "monitoring_promtail_1", port: null, status: "unknown" }
    ],
    overall_status: "unknown"
  });
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [startingServices, setStartingServices] = useState(false);

  // 模擬資料（待後端 API 完成後移除）
  const mockLogs = [
    { id: '1', timestamp: '2026-01-25 10:30:45', level: 'info', user: 'demo_user', action: '登入系統', details: 'IP: 192.168.1.100', source: 'auth' },
    { id: '2', timestamp: '2026-01-25 10:32:10', level: 'info', user: 'demo_user', action: '啟動 Ubuntu 容器', details: 'GPU: gpu-0', source: 'container' },
    { id: '3', timestamp: '2026-01-25 10:35:22', level: 'warning', user: 'system', action: 'GPU 溫度過高', details: 'GPU-3: 82°C', source: 'monitor' },
    { id: '4', timestamp: '2026-01-25 10:40:15', level: 'info', user: 'test_user', action: '登入系統', details: 'IP: 192.168.1.105', source: 'auth' },
    { id: '5', timestamp: '2026-01-25 10:45:30', level: 'error', user: 'system', action: '容器啟動失敗', details: 'Out of memory', source: 'container' },
    { id: '6', timestamp: '2026-01-25 10:50:00', level: 'info', user: 'admin', action: '新增使用者', details: '使用者: new_user', source: 'admin' },
    { id: '7', timestamp: '2026-01-25 11:00:12', level: 'info', user: 'demo_user', action: '停止 Ubuntu 容器', details: 'GPU: gpu-0 已釋放', source: 'container' },
    { id: '8', timestamp: '2026-01-25 11:05:33', level: 'warning', user: 'system', action: '儲存空間不足', details: '剩餘: 15%', source: 'storage' },
    { id: '9', timestamp: '2026-01-25 11:10:45', level: 'info', user: 'test_user', action: '啟動 Jupyter', details: 'GPU: gpu-1', source: 'container' },
    { id: '10', timestamp: '2026-01-25 11:15:00', level: 'error', user: 'system', action: 'API 請求失敗', details: 'Timeout after 30s', source: 'api' }
  ];

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchSystemLogs({
        ...filters,
        page,
        pageSize: 20
      });
      
      if (result && result.logs) {
        setLogs(result.logs);
        setTotalPages(Math.ceil(result.total / 20));
      } else {
        // 如果 API 沒有回傳資料，使用模擬資料
        const filteredMockLogs = mockLogs.filter((log) => {
          if (filters.level !== 'all' && log.level !== filters.level) return false;
          if (filters.search && !JSON.stringify(log).toLowerCase().includes(filters.search.toLowerCase())) return false;
          return true;
        });
        setLogs(filteredMockLogs);
        setTotalPages(1);
        setSnackbar({
          open: true,
          message: '使用模擬資料 - 無法連接到日誌服務',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // 發生錯誤時使用模擬資料
      const filteredMockLogs = mockLogs.filter((log) => {
        if (filters.level !== 'all' && log.level !== filters.level) return false;
        if (filters.search && !JSON.stringify(log).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
      setLogs(filteredMockLogs);
      setTotalPages(1);
      setSnackbar({
        open: true,
        message: '連接日誌服務失敗，使用模擬資料',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadLogs();
    loadMonitoringStatus(); // 同時載入監控狀態
  }, [loadLogs]);

  // ============ 監控服務管理 ============

  const loadMonitoringStatus = useCallback(async () => {
    setMonitoringLoading(true);
    try {
      const status = await fetchMonitoringStatus();
      // 確保回傳的資料格式正確
      if (status && status.containers && Array.isArray(status.containers)) {
        setMonitoringStatus(status);
      } else {
        // 如果資料格式不正確，保持預設狀態
        console.warn('監控狀態資料格式不正確:', status);
        setSnackbar({
          open: true,
          message: '監控狀態資料格式錯誤，使用預設狀態',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Failed to fetch monitoring status:', error);
      setSnackbar({
        open: true,
        message: '無法取得監控服務狀態',
        severity: 'warning'
      });
    } finally {
      setMonitoringLoading(false);
    }
  }, []);

  const handleStartServices = async (services = null) => {
    setStartingServices(true);
    try {
      let result;
      if (services) {
        result = await startMonitoringServices(services);
      } else {
        result = await startMonitoringStack();
      }
      
      setSnackbar({
        open: true,
        message: (result && result.message) || '監控服務啟動成功',
        severity: 'success'
      });
      
      // 重新載入狀態
      setTimeout(() => {
        loadMonitoringStatus();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start monitoring services:', error);
      setSnackbar({
        open: true,
        message: error.message || '啟動監控服務失敗',
        severity: 'error'
      });
    } finally {
      setStartingServices(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <CheckCircle fontSize="small" color="success" />;
      case 'stopped':
      case 'exited':
        return <Cancel fontSize="small" color="error" />;
      case 'unknown':
      default:
        return <HelpOutline fontSize="small" color="disabled" />;
    }
  };

  const getStatusChip = (status) => {
    const config = {
      running: { label: '運行中', color: 'success' },
      stopped: { label: '已停止', color: 'error' },
      exited: { label: '已退出', color: 'error' },
      unknown: { label: '未知', color: 'default' }
    };
    const { label, color } = config[status] || config.unknown;
    return <Chip icon={getStatusIcon(status)} label={label} color={color} size="small" variant="outlined" />;
  };

  // ============ 日誌相關函數 ============

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'info':
      default:
        return <InfoIcon fontSize="small" color="info" />;
    }
  };

  const getLevelChip = (level) => {
    const config = {
      error: { label: '錯誤', color: 'error' },
      warning: { label: '警告', color: 'warning' },
      info: { label: '資訊', color: 'info' }
    };
    const { label, color } = config[level] || config.info;
    return <Chip icon={getLevelIcon(level)} label={label} color={color} size="small" variant="outlined" />;
  };

  const getSourceChip = (source) => {
    const colors = {
      auth: 'primary',
      container: 'secondary',
      monitor: 'warning',
      storage: 'info',
      admin: 'success',
      api: 'default'
    };
    return <Chip label={source} color={colors[source] || 'default'} size="small" />;
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setPage(1);
  };

  // 計算統計數據
  const stats = {
    total: logs.length,
    info: logs.filter((l) => l.level === 'info').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    error: logs.filter((l) => l.level === 'error').length
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          系統日誌
        </Typography>
        <Typography variant="body2" color="text.secondary">
          查看系統操作記錄、錯誤與警告訊息。
        </Typography>
      </Box>

      {/* 監控服務狀態 */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <CardHeader
          title="監控服務狀態"
          subheader="監控系統的 Grafana、Loki、Promtail 服務狀態"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                onClick={loadMonitoringStatus}
                disabled={monitoringLoading}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleStartServices()}
                disabled={startingServices || monitoringStatus.overall_status === 'running'}
              >
                {startingServices ? '啟動中...' : '啟動所有服務'}
              </Button>
            </Box>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            {(monitoringStatus?.containers || []).map((container, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: container.status === 'running' ? 'success.main' : 'divider',
                    backgroundColor: container.status === 'running' ? 'success.50' : 'background.paper'
                  }}
                >
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {container.name}
                      </Typography>
                      {getStatusChip(container.status)}
                    </Box>
                    {container.port && (
                      <Typography variant="body2" color="text.secondary">
                        Port: {container.port}
                      </Typography>
                    )}
                    {container.status === 'running' && container.port && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => window.open(`http://localhost:${container.port}`, '_blank')}
                      >
                        開啟服務
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {/* 總體狀態 */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                總體狀態:
              </Typography>
              {getStatusChip(monitoringStatus.overall_status)}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* 統計卡片 */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" fontWeight={600}>
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              總筆數
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'info.main',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" fontWeight={600} color="info.main">
              {stats.info}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              資訊
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'warning.main',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" fontWeight={600} color="warning.main">
              {stats.warning}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              警告
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'error.main',
              textAlign: 'center'
            }}
          >
            <Typography variant="h4" fontWeight={600} color="error.main">
              {stats.error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              錯誤
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 篩選器 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FilterListIcon color="action" />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>日誌等級</InputLabel>
            <Select
              value={filters.level}
              label="日誌等級"
              onChange={(e) => handleFilterChange('level', e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="info">資訊</MenuItem>
              <MenuItem value="warning">警告</MenuItem>
              <MenuItem value="error">錯誤</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="起始日期"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            type="date"
            label="結束日期"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            placeholder="搜尋..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <Box sx={{ flex: 1 }} />

          <Tooltip title="重新整理">
            <IconButton onClick={loadLogs} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* 日誌表格 */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={160}>時間</TableCell>
                <TableCell width={100}>等級</TableCell>
                <TableCell width={100}>來源</TableCell>
                <TableCell width={120}>使用者</TableCell>
                <TableCell>操作</TableCell>
                <TableCell>詳細資訊</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  sx={{
                    backgroundColor:
                      log.level === 'error'
                        ? 'error.50'
                        : log.level === 'warning'
                        ? 'warning.50'
                        : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {log.timestamp}
                    </Typography>
                  </TableCell>
                  <TableCell>{getLevelChip(log.level)}</TableCell>
                  <TableCell>{getSourceChip(log.source)}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {log.details}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      無符合條件的日誌記錄
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Paper>

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

export default SystemLogs;
