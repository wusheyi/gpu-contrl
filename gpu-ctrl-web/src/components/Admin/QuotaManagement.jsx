import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  fetchUserQuota,
  updateUserQuota,
  fetchDefaultQuota,
  updateDefaultQuota,
  fetchUsers
} from '../../services/adminApi';

const QuotaManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    gpuLimit: 2,
    timeLimit: 24,
    storageLimit: 500
  });
  const [defaultQuota, setDefaultQuota] = useState({
    gpuLimit: 2,
    timeLimit: 24,
    storageLimit: 500
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 模擬資料（待後端 API 完成後移除）
  const mockUsers = [
    { id: '1', username: 'admin', email: 'admin@nkust.edu.tw', quota: { gpuLimit: 10, timeLimit: 720, storageLimit: 2000 } },
    { id: '2', username: 'demo_user', email: 'demo@nkust.edu.tw', quota: { gpuLimit: 2, timeLimit: 24, storageLimit: 500 } },
    { id: '3', username: 'test_user', email: 'test@nkust.edu.tw', quota: { gpuLimit: 4, timeLimit: 48, storageLimit: 1000 } }
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, defaultQuotaData] = await Promise.all([
        fetchUsers(),
        fetchDefaultQuota()
      ]);
      setUsers(usersData.length > 0 ? usersData : mockUsers);
      if (Object.keys(defaultQuotaData).length > 0) {
        setDefaultQuota(defaultQuotaData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setUsers(mockUsers);
      setSnackbar({
        open: true,
        message: '載入資料失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditQuota = (user) => {
    setSelectedUser(user);
    setQuotaForm(user.quota || { gpuLimit: 2, timeLimit: 24, storageLimit: 500 });
    setShowEditDialog(true);
  };

  const handleSaveQuota = async () => {
    try {
      await updateUserQuota(selectedUser.id, quotaForm);
      setShowEditDialog(false);
      setSelectedUser(null);
      setSnackbar({
        open: true,
        message: '配額更新成功',
        severity: 'success'
      });
      loadData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '配額更新失敗',
        severity: 'error'
      });
    }
  };

  const handleSaveDefaultQuota = async () => {
    try {
      await updateDefaultQuota(defaultQuota);
      setSnackbar({
        open: true,
        message: '預設配額更新成功',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '預設配額更新失敗',
        severity: 'error'
      });
    }
  };

  const formatTimeLimit = (hours) => {
    if (hours >= 720) {
      return `${Math.floor(hours / 720)} 個月`;
    }
    if (hours >= 24) {
      return `${Math.floor(hours / 24)} 天`;
    }
    return `${hours} 小時`;
  };

  const formatStorageLimit = (gb) => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)} TB`;
    }
    return `${gb} GB`;
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          配額管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          設定使用者的 GPU 配額、時間限制與儲存空間。
        </Typography>
      </Box>

      {/* 預設配額設定 */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <SettingsIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={600}>
            預設配額設定
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            （新使用者將使用此配額）
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              GPU 數量限制
            </Typography>
            <Slider
              value={defaultQuota.gpuLimit}
              onChange={(e, value) => setDefaultQuota({ ...defaultQuota, gpuLimit: value })}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' }
              ]}
              valueLabelDisplay="on"
            />
            <Typography variant="caption" color="text.secondary">
              同時可使用的 GPU 數量上限
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              時間限制（小時）
            </Typography>
            <Slider
              value={defaultQuota.timeLimit}
              onChange={(e, value) => setDefaultQuota({ ...defaultQuota, timeLimit: value })}
              min={1}
              max={720}
              step={1}
              marks={[
                { value: 24, label: '1天' },
                { value: 168, label: '1週' },
                { value: 720, label: '1月' }
              ]}
              valueLabelDisplay="on"
            />
            <Typography variant="caption" color="text.secondary">
              單次 GPU 使用時間上限
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" gutterBottom>
              儲存空間（GB）
            </Typography>
            <Slider
              value={defaultQuota.storageLimit}
              onChange={(e, value) => setDefaultQuota({ ...defaultQuota, storageLimit: value })}
              min={100}
              max={2000}
              step={100}
              marks={[
                { value: 100, label: '100' },
                { value: 1000, label: '1TB' },
                { value: 2000, label: '2TB' }
              ]}
              valueLabelDisplay="on"
            />
            <Typography variant="caption" color="text.secondary">
              個人儲存空間上限
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveDefaultQuota}
          >
            儲存預設配額
          </Button>
        </Box>
      </Paper>

      {/* 使用者配額列表 */}
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
          使用者配額列表
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>使用者</TableCell>
                <TableCell>電子郵件</TableCell>
                <TableCell align="center">GPU 數量限制</TableCell>
                <TableCell align="center">時間限制</TableCell>
                <TableCell align="center">儲存空間</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell align="center">{user.quota?.gpuLimit || defaultQuota.gpuLimit} 台</TableCell>
                  <TableCell align="center">{formatTimeLimit(user.quota?.timeLimit || defaultQuota.timeLimit)}</TableCell>
                  <TableCell align="center">{formatStorageLimit(user.quota?.storageLimit || defaultQuota.storageLimit)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleEditQuota(user)}>
                      編輯
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 編輯配額對話框 */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>編輯配額 - {selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="body2" gutterBottom>
                GPU 數量限制
              </Typography>
              <Slider
                value={quotaForm.gpuLimit}
                onChange={(e, value) => setQuotaForm({ ...quotaForm, gpuLimit: value })}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="on"
              />
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>
                時間限制（小時）
              </Typography>
              <TextField
                type="number"
                fullWidth
                size="small"
                value={quotaForm.timeLimit}
                onChange={(e) => setQuotaForm({ ...quotaForm, timeLimit: parseInt(e.target.value) || 0 })}
                helperText={`等於 ${formatTimeLimit(quotaForm.timeLimit)}`}
              />
            </Box>

            <Box>
              <Typography variant="body2" gutterBottom>
                儲存空間（GB）
              </Typography>
              <TextField
                type="number"
                fullWidth
                size="small"
                value={quotaForm.storageLimit}
                onChange={(e) => setQuotaForm({ ...quotaForm, storageLimit: parseInt(e.target.value) || 0 })}
                helperText={`等於 ${formatStorageLimit(quotaForm.storageLimit)}`}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveQuota}>
            儲存
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

export default QuotaManagement;
