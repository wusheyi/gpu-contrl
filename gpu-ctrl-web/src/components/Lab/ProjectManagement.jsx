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
  Grid,
  IconButton,
  LinearProgress,
  Paper,
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
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import ScienceIcon from '@mui/icons-material/Science';
import StorageIcon from '@mui/icons-material/Storage';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer,
  getConnectionStatus
} from '../../services/connectorApi';

const ProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [connected, setConnected] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    gpuId: 0,
    startDate: '',
    endDate: '',
    gpuQuota: 7,
    storageQuota: 100
  });

  // H200 GPU 配置
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10;

  useEffect(() => {
    checkConnection();
    loadProjects();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected || false);
    } catch {
      setConnected(false);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      const containers = containerData.containers || [];
      const migInfo = migData.mig_info || {};

      // 根據 GPU 生成專案（每個 GPU 為一個專案）
      const projectList = [];
      
      for (let gpuId = 0; gpuId < GPU_COUNT; gpuId++) {
        const gpuContainers = containers.filter(c => {
          const port = c.ports?.[0]?.host_port || 0;
          return Math.floor(port / 10000) === gpuId;
        });

        const migEnabled = migInfo[gpuId]?.mig_enabled || false;
        const migInstances = migInfo[gpuId]?.instances?.length || 0;

        projectList.push({
          id: `proj-gpu${gpuId}`,
          name: `GPU ${gpuId} 訓練專案`,
          description: `使用 ${GPU_NAME} GPU ${gpuId} 的 MIG 資源進行深度學習訓練`,
          category: '深度學習',
          owner: {
            id: 'lab001',
            name: '智慧計算實驗室',
            email: 'smartlab@nkust.edu.tw'
          },
          gpuId: gpuId,
          members: gpuContainers.map((c, idx) => ({
            id: c.id,
            name: `使用者 ${idx + 1}`,
            email: `user${idx + 1}@nkust.edu.tw`,
            role: idx === 0 ? 'lead' : 'member',
            port: c.ports?.[0]?.host_port,
            containerId: c.id
          })),
          resources: {
            gpuQuota: MIG_PER_GPU,
            gpuUsed: gpuContainers.length,
            storageQuota: 500,
            storageUsed: gpuContainers.length * 50,
            migEnabled: migEnabled,
            migInstances: migInstances
          },
          experiments: gpuContainers.map((c, idx) => ({
            id: c.id,
            name: `實驗 ${idx + 1}`,
            status: c.status?.includes('Up') ? 'running' : 'stopped',
            port: c.ports?.[0]?.host_port
          })),
          status: migEnabled ? (gpuContainers.length > 0 ? 'active' : 'ready') : 'pending',
          createdAt: new Date().toISOString().split('T')[0],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      setProjects(projectList);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    try {
      // 在指定 GPU 上啟動容器
      await startContainer(formData.gpuId, 1, 'ssh-nvidia:latest');
      setDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleUpdateProject = async () => {
    setDialogOpen(false);
    resetForm();
    loadProjects();
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('確定要刪除此專案嗎？所有相關容器將被停止。')) {
      try {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          // 停止所有相關容器
          for (const member of project.members) {
            if (member.containerId) {
              await stopContainer(member.containerId);
            }
          }
        }
        loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !selectedProject) return;
    try {
      // 在專案對應的 GPU 上啟動新容器
      await startContainer(selectedProject.gpuId, 1, 'ssh-nvidia:latest');
      setMemberEmail('');
      loadProjects();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('確定要移除此成員嗎？這將停止其容器。')) {
      try {
        await stopContainer(memberId);
        loadProjects();
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      category: project.category,
      startDate: project.startDate,
      endDate: project.endDate,
      gpuQuota: project.resources?.gpuQuota || 2,
      storageQuota: project.resources?.storageQuota || 100
    });
    setDialogOpen(true);
  };

  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setDetailDialogOpen(true);
  };

  const handleManageMembers = (project) => {
    setSelectedProject(project);
    setMemberDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedProject(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      startDate: '',
      endDate: '',
      gpuQuota: 2,
      storageQuota: 100
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      pending: 'warning',
      completed: 'default',
      suspended: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '進行中',
      pending: '待審核',
      completed: '已完成',
      suspended: '已暫停'
    };
    return labels[status] || status;
  };

  const getExperimentStatusColor = (status) => {
    const colors = {
      running: 'primary',
      queued: 'warning',
      completed: 'success',
      failed: 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>專案管理</Typography>
          <Typography variant="body2" color="text.secondary">
            建立研究專案，管理成員與資源配額
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadProjects}>
            重新整理
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>
            建立專案
          </Button>
        </Stack>
      </Stack>

      {/* 統計卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <FolderIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{projects.length}</Typography>
              <Typography variant="body2" color="text.secondary">專案總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <ScienceIcon color="success" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {projects.reduce((acc, p) => acc + (p.experiments?.length || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">實驗總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon color="info" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {projects.reduce((acc, p) => acc + (p.members?.length || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">成員總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {projects.reduce((acc, p) => acc + (p.resources?.gpuUsed || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">使用中 GPU</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {projects.map((project) => (
            <Grid item xs={12} md={6} lg={4} key={project.id}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>{project.name}</Typography>
                      <Chip size="small" label={project.category} variant="outlined" sx={{ mt: 0.5 }} />
                    </Box>
                    <Chip size="small" label={getStatusLabel(project.status)} color={getStatusColor(project.status)} />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {project.description?.length > 60 ? project.description.substring(0, 60) + '...' : project.description}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Grid container spacing={1} sx={{ mb: 1.5 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">GPU 使用</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(project.resources?.gpuUsed / project.resources?.gpuQuota) * 100}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption">
                          {project.resources?.gpuUsed}/{project.resources?.gpuQuota}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">儲存空間</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(project.resources?.storageUsed / project.resources?.storageQuota) * 100}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          color="secondary"
                        />
                        <Typography variant="caption">
                          {Math.round(project.resources?.storageUsed / project.resources?.storageQuota * 100)}%
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip size="small" icon={<PeopleIcon />} label={`${project.members?.length || 0} 成員`} variant="outlined" />
                    <Chip size="small" icon={<ScienceIcon />} label={`${project.experiments?.length || 0} 實驗`} variant="outlined" />
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<VisibilityIcon />} onClick={() => handleViewDetails(project)}>
                      詳情
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<PeopleIcon />} onClick={() => handleManageMembers(project)}>
                      成員
                    </Button>
                    <IconButton size="small" onClick={() => handleEditProject(project)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteProject(project.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 建立/編輯專案對話框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FolderIcon color="primary" />
            <span>{selectedProject ? '編輯專案' : '建立專案'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="專案名稱"
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
              rows={3}
            />
            <TextField
              label="研究類別"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
              placeholder="例如：自然語言處理、電腦視覺、強化學習"
            />
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">專案期間</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="開始日期"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="結束日期"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">資源配額申請</Typography>
            {selectedProject && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                配額僅能在專案申請時設定，建立後無法變更。如需調整配額，請聯繫管理員重新審核。
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="GPU 配額 (張)"
                  type="number"
                  value={formData.gpuQuota}
                  onChange={(e) => setFormData({ ...formData, gpuQuota: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 1, max: 16 }}
                  helperText="專案可同時使用的最大 GPU 數量"
                  disabled={!!selectedProject}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="儲存空間配額 (GB)"
                  type="number"
                  value={formData.storageQuota}
                  onChange={(e) => setFormData({ ...formData, storageQuota: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 10, max: 2000 }}
                  helperText="專案可使用的最大儲存空間"
                  disabled={!!selectedProject}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={selectedProject ? handleUpdateProject : handleCreateProject}
            disabled={!formData.name}
          >
            {selectedProject ? '更新' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 專案詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <FolderIcon color="primary" />
              <span>專案詳情</span>
            </Stack>
            <Chip label={getStatusLabel(selectedProject?.status)} color={getStatusColor(selectedProject?.status)} />
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedProject && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>{selectedProject.name}</Typography>
                <Chip size="small" label={selectedProject.category} variant="outlined" sx={{ mt: 0.5, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">{selectedProject.description}</Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">專案 ID</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedProject.id}</Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedProject.id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">所屬實驗室</Typography>
                    <Typography variant="body2">{selectedProject.owner?.name}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">開始日期</Typography>
                    <Typography variant="body2">{selectedProject.startDate}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">結束日期</Typography>
                    <Typography variant="body2">{selectedProject.endDate}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>資源使用狀況</Typography>
                  <Chip size="small" label="配額已鎖定" color="warning" variant="outlined" />
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  專案配額在申請時已確定，無法透過編輯變更。如需調整配額，請聯繫管理員重新審核。
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      GPU 使用: {selectedProject.resources?.gpuUsed} / {selectedProject.resources?.gpuQuota} 張
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(selectedProject.resources?.gpuUsed / selectedProject.resources?.gpuQuota) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      儲存空間: {selectedProject.resources?.storageUsed} / {selectedProject.resources?.storageQuota} GB
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(selectedProject.resources?.storageUsed / selectedProject.resources?.storageQuota) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                      color="secondary"
                    />
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>實驗列表</Typography>
                {selectedProject.experiments?.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedProject.experiments.map((exp) => (
                      <Chip
                        key={exp.id}
                        label={exp.name}
                        color={getExperimentStatusColor(exp.status)}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">尚無實驗</Typography>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  成員列表 ({selectedProject.members?.length || 0})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedProject.members?.map((member) => (
                    <Chip
                      key={member.id}
                      label={`${member.name} (${member.role === 'lead' ? '負責人' : '成員'})`}
                      color={member.role === 'lead' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleManageMembers(selectedProject)} startIcon={<PeopleIcon />}>
            管理成員
          </Button>
          <Button variant="contained" onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 成員管理對話框 */}
      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PeopleIcon color="primary" />
            <span>管理成員 - {selectedProject?.name}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>新增成員</Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="成員 Email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleAddMember}>
                  新增
                </Button>
              </Stack>
            </Paper>

            <Typography variant="subtitle2">目前成員 ({selectedProject?.members?.length || 0})</Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>姓名</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">角色</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedProject?.members?.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={member.role === 'lead' ? '負責人' : '成員'}
                          color={member.role === 'lead' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {member.role !== 'lead' && (
                          <IconButton size="small" color="error" onClick={() => handleRemoveMember(member.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setMemberDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectManagement;
