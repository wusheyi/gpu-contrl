import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import ScienceIcon from '@mui/icons-material/Science';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import {
  startUbuntu,
  stopUbuntu,
  startJupyter,
  stopJupyter,
  getConnectionStatus,
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer
} from '../../services/connectorApi';

const DemoTest = ({ username }) => {
  const [showSSHDialog, setShowSSHDialog] = useState(false);
  const [isStartingUbuntu, setIsStartingUbuntu] = useState(false);
  const [isStoppingUbuntu, setIsStoppingUbuntu] = useState(false);
  const [isStartingJupyter, setIsStartingJupyter] = useState(false);
  const [isStoppingJupyter, setIsStoppingJupyter] = useState(false);
  const [ubuntuStatus, setUbuntuStatus] = useState('stopped');
  const [jupyterStatus, setJupyterStatus] = useState('stopped');
  const [sshInfo, setSshInfo] = useState({
    command: `ssh root@10.133.77.231 -p 10001`,
    password: '123456'
  });
  const [logs, setLogs] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // H200 相關狀態
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [containers, setContainers] = useState([]);
  const [migInfo, setMigInfo] = useState({});
  const [selectedGpu, setSelectedGpu] = useState(0);
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);

  const logSummary = useMemo(() => logs.slice(-8).reverse(), [logs]);

  // 載入 H200 狀態
  const loadH200Status = useCallback(async () => {
    setLoading(true);
    try {
      const statusRes = await getConnectionStatus();
      setIsConnected(statusRes.connected);
      
      if (statusRes.connected) {
        const [migRes, containerRes] = await Promise.all([
          getMigStatus(),
          listContainers()
        ]);
        setMigInfo(migRes.mig_info || {});
        setContainers(containerRes.containers || []);
        
        // 檢查是否有容器在運行
        if (containerRes.containers?.length > 0) {
          setUbuntuStatus('running');
          // 更新 SSH 資訊
          const firstContainer = containerRes.containers[0];
          const portMatch = firstContainer.ports?.match(/:(\d+)->/);
          if (portMatch) {
            setSshInfo({
              command: `ssh root@10.133.77.231 -p ${portMatch[1]}`,
              password: '123456'
            });
          }
        } else {
          setUbuntuStatus('stopped');
        }
      }
    } catch (error) {
      console.error('Failed to load H200 status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadH200Status();
    const interval = setInterval(loadH200Status, 30000);
    return () => clearInterval(interval);
  }, [loadH200Status]);

  const parseSSHInfo = (rawInfo) => {
    if (!rawInfo) {
      return {
        command: `ssh root@10.133.77.231 -p 10001`,
        password: '123456'
      };
    }

    const parts = String(rawInfo).split('<br>');
    const command = (parts[0] || '').trim();
    let password = '';
    if (parts[1]) {
      const match = parts[1].match(/密碼[:：]\s*(.+)$/);
      password = match ? match[1].trim() : parts[1].trim();
    }

    return {
      command: command || `ssh root@10.133.77.231 -p 10001`,
      password: password || '123456'
    };
  };

  const resetSSHInfo = () => {
    setSshInfo({
      command: `ssh root@10.133.77.231 -p 10001`,
      password: '123456'
    });
  };

  const appendLogs = (nextLogs) => {
    if (Array.isArray(nextLogs) && nextLogs.length) {
      setLogs((current) => [...current, ...nextLogs]);
    }
  };

  const handleSSHConnect = async () => {
    setIsStartingUbuntu(true);
    try {
      // 使用新的 API 啟動容器
      const response = await startContainer(selectedGpu, 1, 'ssh-nvidia:latest');
      const port = response.ports?.[0] || 10001;
      
      setSshInfo({
        command: `ssh root@10.133.77.231 -p ${port}`,
        password: '123456'
      });
      
      appendLogs([{ type: 'success', message: `容器已啟動，Port: ${port}` }]);
      setUbuntuStatus('running');
      setShowSSHDialog(true);
      setSnackbar({
        open: true,
        message: response.message || '已啟動 Ubuntu 容器',
        severity: 'success'
      });
      loadH200Status();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '啟動失敗，請稍後再試。',
        severity: 'error'
      });
    } finally {
      setIsStartingUbuntu(false);
    }
  };

  const handleStopUbuntu = async () => {
    setIsStoppingUbuntu(true);
    try {
      // 停止所有 Ubuntu 容器
      for (const container of containers) {
        await stopContainer(container.id);
      }
      appendLogs([{ type: 'success', message: '容器已停止' }]);
      setUbuntuStatus('stopped');
      resetSSHInfo();
      setSnackbar({
        open: true,
        message: '已停止 Ubuntu 容器',
        severity: 'success'
      });
      loadH200Status();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '停止失敗，請稍後再試。',
        severity: 'error'
      });
    } finally {
      setIsStoppingUbuntu(false);
    }
  };

  const handleStartJupyter = async () => {
    setIsStartingJupyter(true);
    try {
      // 啟動 Jupyter 容器
      const response = await startContainer(selectedGpu, 1, 'jupyter-nvidia:latest');
      const port = response.ports?.[0] || 10001;
      const jupyterPort = port + 8000;
      
      appendLogs([{ type: 'success', message: `Jupyter 已啟動，Port: ${jupyterPort}` }]);
      setJupyterStatus('running');
      
      // 開啟 Jupyter
      window.open(`http://10.133.77.231:${jupyterPort}`, '_blank', 'noopener,noreferrer');
      
      setSnackbar({
        open: true,
        message: response.message || '已啟動 Jupyter',
        severity: 'success'
      });
      loadH200Status();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '啟動失敗，請稍後再試。',
        severity: 'error'
      });
    } finally {
      setIsStartingJupyter(false);
    }
  };

  const handleStopJupyter = async () => {
    setIsStoppingJupyter(true);
    try {
      // 找到 Jupyter 容器並停止
      const jupyterContainer = containers.find(c => c.image?.includes('jupyter'));
      if (jupyterContainer) {
        await stopContainer(jupyterContainer.id);
      }
      appendLogs([{ type: 'success', message: 'Jupyter 已停止' }]);
      setJupyterStatus('stopped');
      setSnackbar({
        open: true,
        message: '已停止 Jupyter',
        severity: 'success'
      });
      loadH200Status();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '停止失敗，請稍後再試。',
        severity: 'error'
      });
    } finally {
      setIsStoppingJupyter(false);
    }
  };

  const handleCopy = async (text, label) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
      setSnackbar({
        open: true,
        message: `${label} 已複製。`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '複製失敗，請手動複製。',
        severity: 'error'
      });
    }
  };

  const handleCloseDialog = () => {
    setShowSSHDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((current) => ({ ...current, open: false }));
  };

  const isUbuntuStartDisabled = ubuntuStatus === 'running' || isStartingUbuntu || isStoppingUbuntu;
  const isUbuntuStopDisabled = ubuntuStatus === 'stopped' || isStartingUbuntu || isStoppingUbuntu;
  const isJupyterStartDisabled = jupyterStatus === 'running' || isStartingJupyter || isStoppingJupyter;
  const isJupyterStopDisabled = jupyterStatus === 'stopped' || isStartingJupyter || isStoppingJupyter;

  return (
    <>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={600}>
              GPU 測試環境
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SSH 與 Jupyter 的 H200 GPU 測試入口
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              label={isConnected ? '已連線' : '未連線'}
              color={isConnected ? 'success' : 'default'}
            />
            <IconButton onClick={loadH200Status} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* GPU 選擇 */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <MemoryIcon color="primary" />
          <Typography variant="subtitle2">選擇 GPU：</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={selectedGpu}
              onChange={(e) => setSelectedGpu(e.target.value)}
            >
              {[0, 1, 2, 3].map((gpuId) => {
                const info = migInfo[gpuId] || {};
                const instances = info.instances?.length || 0;
                return (
                  <MenuItem key={gpuId} value={gpuId}>
                    GPU {gpuId} {instances > 0 ? `(${instances} MIG)` : ''}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            運行中容器: {containers.length}
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'box-shadow 200ms ease, border-color 200ms ease',
              '&:hover': {
                borderColor: 'secondary.main',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TerminalIcon color="secondary" />
                  <Typography variant="h6">SSH 連線</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  使用 SSH 透過 CLI 工具、工作與腳本連線 GPU 伺服器。
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSSHConnect}
                    disabled={isUbuntuStartDisabled}
                  >
                    {isStartingUbuntu ? '啟動中...' : '啟動 Ubuntu 容器'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleStopUbuntu}
                    disabled={isUbuntuStopDisabled}
                  >
                    {isStoppingUbuntu ? '停止中...' : '停止 Ubuntu 容器'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              border: '1px solid',
              borderColor: 'divider',
              transition: 'box-shadow 200ms ease, border-color 200ms ease',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 4
              }
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ScienceIcon color="secondary" />
                  <Typography variant="h6">Jupyter 筆記本</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  啟動筆記本工作區，用於實驗、訓練與分析。
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleStartJupyter}
                    disabled={isJupyterStartDisabled}
                  >
                    {isStartingJupyter ? '啟動中...' : '啟動 Jupyter'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleStopJupyter}
                    disabled={isJupyterStopDisabled}
                  >
                    {isStoppingJupyter ? '停止中...' : '停止 Jupyter'}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {ubuntuStatus === 'running' && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              Ubuntu 連線資訊
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="SSH 指令"
                  value={sshInfo.command}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleCopy(sshInfo.command, '指令')}
                          aria-label="複製 SSH 指令"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="密碼"
                  type="password"
                  value={sshInfo.password}
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => handleCopy(sshInfo.password, '密碼')}
                          aria-label="複製 SSH 密碼"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
              啟動 Ubuntu 容器後會更新上述帳號與密碼。
            </Typography>
          </Stack>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" fontWeight={600}>
            摘要紀錄
          </Typography>
          {logSummary.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              尚無紀錄。
            </Typography>
          ) : (
            <List disablePadding>
              {logSummary.map((entry, index) => (
                <ListItem
                  key={`${entry.message}-${index}`}
                  sx={{
                    px: 0,
                    py: 0.5,
                    color:
                      entry.type === 'error'
                        ? 'error.main'
                        : entry.type === 'success'
                        ? 'success.main'
                        : 'text.primary'
                  }}
                >
                  <Typography variant="body2">
                    {entry.command
                      ? `[${entry.type}] ${entry.message} — ${entry.command}`
                      : `[${entry.type}] ${entry.message}`}
                  </Typography>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Paper>

      <Dialog open={showSSHDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>SSH 連線</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              複製指令與密碼以連線 GPU 主機。
            </Typography>
            <TextField
              label="SSH 指令"
              value={sshInfo.command}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleCopy(sshInfo.command, '指令')}
                      aria-label="複製 SSH 指令"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              label="密碼"
              type="password"
              value={sshInfo.password}
              fullWidth
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleCopy(sshInfo.password, '密碼')}
                      aria-label="複製 SSH 密碼"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Typography variant="caption" color="text.secondary">
              請妥善保管憑證並定期更換密碼。
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>關閉</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DemoTest;
