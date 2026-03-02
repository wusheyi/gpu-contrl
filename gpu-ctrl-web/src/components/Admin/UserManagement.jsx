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
  IconButton,
  InputAdornment,
  InputLabel,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword
} from '../../services/adminApi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // 模擬資料（待後端 API 完成後移除）
  const mockUsers = [
    { id: '1', username: 'admin', email: 'admin@nkust.edu.tw', role: 'admin', status: 'active', lastLogin: '2026-01-25 10:30' },
    { id: '2', username: 'demo_user', email: 'demo@nkust.edu.tw', role: 'user', status: 'active', lastLogin: '2026-01-24 15:20' },
    { id: '3', username: 'test_user', email: 'test@nkust.edu.tw', role: 'user', status: 'inactive', lastLogin: '2026-01-20 09:00' }
  ];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      // 如果 API 回傳空陣列，使用模擬資料
      setUsers(data.length > 0 ? data : mockUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers(mockUsers);
      setSnackbar({
        open: true,
        message: '載入使用者列表失敗',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async () => {
    try {
      await createUser(formData);
      setShowAddDialog(false);
      setFormData({ username: '', email: '', role: 'user', password: '' });
      setSnackbar({
        open: true,
        message: '使用者新增成功',
        severity: 'success'
      });
      loadUsers();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '新增使用者失敗',
        severity: 'error'
      });
    }
  };

  const handleEditUser = async () => {
    try {
      await updateUser(selectedUser.id, formData);
      setShowEditDialog(false);
      setSelectedUser(null);
      setFormData({ username: '', email: '', role: 'user', password: '' });
      setSnackbar({
        open: true,
        message: '使用者更新成功',
        severity: 'success'
      });
      loadUsers();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '更新使用者失敗',
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(selectedUser.id);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      setSnackbar({
        open: true,
        message: '使用者刪除成功',
        severity: 'success'
      });
      loadUsers();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '刪除使用者失敗',
        severity: 'error'
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
      setSnackbar({
        open: true,
        message: '密碼重設成功',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '密碼重設失敗',
        severity: 'error'
      });
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      password: ''
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const openResetPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordDialog(true);
  };

  const getRoleChip = (role) => {
    return role === 'admin' ? (
      <Chip label="管理員" color="primary" size="small" />
    ) : (
      <Chip label="一般使用者" color="default" size="small" />
    );
  };

  const getStatusChip = (status) => {
    return status === 'active' ? (
      <Chip label="啟用" color="success" size="small" />
    ) : (
      <Chip label="停用" color="error" size="small" />
    );
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          使用者管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          管理系統使用者帳號、權限與配額設定。
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="搜尋使用者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ flex: 1, maxWidth: 300 }}
          />
          <Box sx={{ flex: 1 }} />
          <Tooltip title="重新整理">
            <IconButton onClick={loadUsers} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            新增使用者
          </Button>
        </Stack>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>帳號</TableCell>
                <TableCell>電子郵件</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>最後登入</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{getStatusChip(user.status)}</TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="編輯">
                      <IconButton size="small" onClick={() => openEditDialog(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="重設密碼">
                      <IconButton size="small" onClick={() => openResetPasswordDialog(user)}>
                        <LockResetIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="刪除">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => openDeleteDialog(user)}
                        disabled={user.role === 'admin'}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">無符合條件的使用者</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 新增使用者對話框 */}
      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增使用者</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="帳號"
              fullWidth
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
            <TextField
              label="電子郵件"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                value={formData.role}
                label="角色"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="user">一般使用者</MenuItem>
                <MenuItem value="admin">管理員</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="密碼"
              type="password"
              fullWidth
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddUser}>
            新增
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯使用者對話框 */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>編輯使用者</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="帳號"
              fullWidth
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled
            />
            <TextField
              label="電子郵件"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                value={formData.role}
                label="角色"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="user">一般使用者</MenuItem>
                <MenuItem value="admin">管理員</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleEditUser}>
            儲存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除使用者「{selectedUser?.username}」嗎？此操作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>
            刪除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 重設密碼對話框 */}
      <Dialog open={showResetPasswordDialog} onClose={() => setShowResetPasswordDialog(false)}>
        <DialogTitle>重設密碼</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              為使用者「{selectedUser?.username}」設定新密碼：
            </Typography>
            <TextField
              label="新密碼"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetPasswordDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleResetPassword}>
            重設
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

export default UserManagement;
