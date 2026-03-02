import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
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
import ClassIcon from '@mui/icons-material/Class';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import MemoryIcon from '@mui/icons-material/Memory';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import StopIcon from '@mui/icons-material/Stop';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  getMigStatus,
  listContainers,
  startContainer,
  stopContainer,
  connect,
  getConnectionStatus
} from '../../services/connectorApi';

const VirtualClassroom = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gpuInfo, setGpuInfo] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    courseName: '',
    description: '',
    gpuCount: 1,
    gpuMemory: 10,
    maxStudents: 28,
    image: 'ssh-nvidia:latest',
    // 課程期間（申請後不可變更）
    courseStartDate: '',
    courseEndDate: '',
    // 上課時段設定（申請後不可變更）
    classScheduleType: 'weekly', // 'once' | 'weekly'
    classWeeklyDays: [], // [0-6] 代表週日到週六
    classStartTime: '09:00',
    classEndTime: '12:00',
    // 作業時段設定（可選，申請後不可變更）
    homeworkEnabled: false,
    homeworkScheduleType: 'weekly', // 'once' | 'weekly'
    homeworkWeeklyDays: [],
    homeworkStartTime: '18:00',
    homeworkEndTime: '21:00',
    homeworkAutoDistribute: true // 系統自動平均分配 GPU 給學生
  });
  const [studentEmail, setStudentEmail] = useState('');

  // H200 GPU 配置常數
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10; // GB per MIG instance

  // 星期名稱對應
  const weekDayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  useEffect(() => {
    checkConnection();
    loadClassrooms();
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

  // 載入教室資料（從真實 GPU 狀態生成）
  const loadClassrooms = async () => {
    setLoading(true);
    try {
      // 取得 MIG 狀態和容器列表
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      setGpuInfo(migData.mig_info || {});
      const containers = containerData.containers || [];

      // 根據容器分佈生成虛擬教室資料
      // 每個 GPU 的容器群組為一個虛擬教室
      const classroomMap = new Map();
      
      containers.forEach((container) => {
        const port = container.ports?.[0]?.host_port || 0;
        const gpuId = Math.floor(port / 10000);
        
        if (!classroomMap.has(gpuId)) {
          classroomMap.set(gpuId, {
            id: `gpu-${gpuId}-classroom`,
            name: `GPU ${gpuId} 教室`,
            courseName: `H200 深度學習實作`,
            description: `使用 GPU ${gpuId} 的 MIG 資源進行深度學習訓練`,
            teacher: {
              id: 'teacher001',
              name: '教師',
              email: 'teacher@nkust.edu.tw'
            },
            gpuConfig: {
              gpuId: gpuId,
              totalGpuCount: 1,
              gpuType: GPU_NAME,
              gpuMemoryPerStudent: MIG_MEMORY,
              migEnabled: migData.mig_info?.[gpuId]?.mig_enabled || false,
              migPartitions: [],
              runningContainers: []
            },
            courseStartDate: new Date().toISOString().split('T')[0],
            courseEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            classSchedule: {
              type: 'weekly',
              weeklyDays: [1, 3, 5],
              startTime: '09:00',
              endTime: '12:00'
            },
            homeworkSchedule: {
              enabled: true,
              type: 'weekly',
              weeklyDays: [0, 6],
              startTime: '09:00',
              endTime: '21:00',
              autoDistribute: true
            },
            students: [],
            maxStudents: MIG_PER_GPU,
            image: 'ssh-nvidia:latest',
            status: 'active',
            createdAt: new Date().toISOString(),
            accessUrl: `ssh root@10.133.77.231 -p ${gpuId * 10000 + 1}`
          });
        }
        
        const classroom = classroomMap.get(gpuId);
        const studentIndex = classroom.students.length;
        
        // 將容器視為學生
        classroom.students.push({
          id: container.id,
          name: `學生 ${studentIndex + 1}`,
          email: `student${studentIndex + 1}@nkust.edu.tw`,
          status: container.status?.includes('Up') ? 'active' : 'inactive',
          port: port,
          sshCommand: `ssh root@10.133.77.231 -p ${port}`
        });
        
        classroom.gpuConfig.runningContainers.push({
          id: container.id,
          port: port,
          status: container.status
        });
      });

      // 如果沒有容器，也顯示可用的 GPU 教室
      for (let i = 0; i < GPU_COUNT; i++) {
        if (!classroomMap.has(i) && migData.mig_info?.[i]?.mig_enabled) {
          classroomMap.set(i, {
            id: `gpu-${i}-classroom`,
            name: `GPU ${i} 教室`,
            courseName: `H200 深度學習實作`,
            description: `使用 GPU ${i} 的 MIG 資源進行深度學習訓練`,
            teacher: {
              id: 'teacher001',
              name: '教師',
              email: 'teacher@nkust.edu.tw'
            },
            gpuConfig: {
              gpuId: i,
              totalGpuCount: 1,
              gpuType: GPU_NAME,
              gpuMemoryPerStudent: MIG_MEMORY,
              migEnabled: true,
              migPartitions: migData.mig_info[i]?.instances || [],
              runningContainers: []
            },
            courseStartDate: new Date().toISOString().split('T')[0],
            courseEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            classSchedule: {
              type: 'weekly',
              weeklyDays: [1, 3, 5],
              startTime: '09:00',
              endTime: '12:00'
            },
            homeworkSchedule: {
              enabled: false,
              type: 'weekly',
              weeklyDays: [],
              startTime: '',
              endTime: '',
              autoDistribute: false
            },
            students: [],
            maxStudents: MIG_PER_GPU,
            image: 'ssh-nvidia:latest',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            accessUrl: null
          });
        }
      }

      setClassrooms(Array.from(classroomMap.values()).sort((a, b) => 
        a.gpuConfig.gpuId - b.gpuConfig.gpuId
      ));
    } catch (error) {
      console.error('Failed to fetch classrooms:', error);
    }
    setLoading(false);
  };

  // 建立教室（在指定 GPU 上啟動容器）
  const handleCreateClassroom = async () => {
    try {
      const gpuId = formData.gpuCount - 1; // 簡化：使用 GPU count 作為 GPU ID
      await startContainer(gpuId, formData.maxStudents, formData.image);
      setDialogOpen(false);
      resetForm();
      loadClassrooms();
    } catch (error) {
      console.error('Failed to create classroom:', error);
    }
  };

  const handleUpdateClassroom = async () => {
    // 更新邏輯（主要是更新本地狀態）
    setDialogOpen(false);
    resetForm();
    loadClassrooms();
  };

  const handleDeleteClassroom = async (classroomId) => {
    if (window.confirm('確定要刪除此虛擬教室嗎？這將停止所有相關容器。')) {
      try {
        const classroom = classrooms.find(c => c.id === classroomId);
        if (classroom) {
          // 停止所有相關容器
          for (const student of classroom.students) {
            await stopContainer(student.id);
          }
        }
        loadClassrooms();
      } catch (error) {
        console.error('Failed to delete classroom:', error);
      }
    }
  };

  const handleStartClassroom = async (classroomId) => {
    try {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (classroom) {
        await startContainer(classroom.gpuConfig.gpuId, 1, classroom.image);
      }
      loadClassrooms();
    } catch (error) {
      console.error('Failed to start classroom:', error);
    }
  };

  const handleStopClassroom = async (classroomId) => {
    try {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (classroom) {
        // 停止所有相關容器
        for (const student of classroom.students) {
          await stopContainer(student.id);
        }
      }
      loadClassrooms();
    } catch (error) {
      console.error('Failed to stop classroom:', error);
    }
  };

  const handleAddStudent = async () => {
    if (!studentEmail.trim() || !selectedClassroom) return;
    try {
      // 在教室對應的 GPU 上啟動新容器
      await startContainer(selectedClassroom.gpuConfig.gpuId, 1, selectedClassroom.image);
      setStudentEmail('');
      loadClassrooms();
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (window.confirm('確定要移除此學生嗎？這將停止其容器。')) {
      try {
        await stopContainer(studentId);
        loadClassrooms();
      } catch (error) {
        console.error('Failed to remove student:', error);
      }
    }
  };

  const handleEditClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    setFormData({
      name: classroom.name,
      courseName: classroom.courseName,
      description: classroom.description,
      gpuCount: classroom.gpuConfig?.totalGpuCount || 1,
      gpuMemory: classroom.gpuConfig?.gpuMemoryPerStudent || 8,
      maxStudents: classroom.maxStudents,
      image: classroom.image,
      // 這些欄位編輯時會被禁用
      courseStartDate: classroom.courseStartDate || '',
      courseEndDate: classroom.courseEndDate || '',
      classScheduleType: classroom.classSchedule?.scheduleType || 'weekly',
      classWeeklyDays: classroom.classSchedule?.weeklyDays || [],
      classStartTime: classroom.classSchedule?.startTime || '09:00',
      classEndTime: classroom.classSchedule?.endTime || '12:00',
      homeworkEnabled: classroom.homeworkSchedule?.enabled || false,
      homeworkScheduleType: classroom.homeworkSchedule?.scheduleType || 'weekly',
      homeworkWeeklyDays: classroom.homeworkSchedule?.weeklyDays || [],
      homeworkStartTime: classroom.homeworkSchedule?.startTime || '18:00',
      homeworkEndTime: classroom.homeworkSchedule?.endTime || '21:00',
      homeworkAutoDistribute: classroom.homeworkSchedule?.autoDistribute || true
    });
    setDialogOpen(true);
  };

  const handleViewDetails = (classroom) => {
    setSelectedClassroom(classroom);
    setDetailDialogOpen(true);
  };

  const handleManageStudents = (classroom) => {
    setSelectedClassroom(classroom);
    setStudentDialogOpen(true);
  };

  // 格式化週間日期顯示
  const formatWeeklyDays = (days) => {
    if (!days || days.length === 0) return '未設定';
    return days.map(d => weekDayNames[d]).join('、');
  };

  const resetForm = () => {
    setSelectedClassroom(null);
    setFormData({
      name: '',
      courseName: '',
      description: '',
      gpuCount: 1,
      gpuMemory: 8,
      maxStudents: 30,
      image: 'pytorch/pytorch:2.0-cuda11.7',
      courseStartDate: '',
      courseEndDate: '',
      classScheduleType: 'weekly',
      classWeeklyDays: [],
      classStartTime: '09:00',
      classEndTime: '12:00',
      homeworkEnabled: false,
      homeworkScheduleType: 'weekly',
      homeworkWeeklyDays: [],
      homeworkStartTime: '18:00',
      homeworkEndTime: '21:00',
      homeworkAutoDistribute: true
    });
  };

  // 切換上課日期選擇
  const toggleClassWeekDay = (dayIndex) => {
    setFormData(prev => {
      const newDays = prev.classWeeklyDays.includes(dayIndex)
        ? prev.classWeeklyDays.filter(d => d !== dayIndex)
        : [...prev.classWeeklyDays, dayIndex].sort((a, b) => a - b);
      return { ...prev, classWeeklyDays: newDays };
    });
  };

  // 切換作業日期選擇
  const toggleHomeworkWeekDay = (dayIndex) => {
    setFormData(prev => {
      const newDays = prev.homeworkWeeklyDays.includes(dayIndex)
        ? prev.homeworkWeeklyDays.filter(d => d !== dayIndex)
        : [...prev.homeworkWeeklyDays, dayIndex].sort((a, b) => a - b);
      return { ...prev, homeworkWeeklyDays: newDays };
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      scheduled: 'info',
      completed: 'default',
      stopped: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: '進行中',
      scheduled: '已排程',
      completed: '已結束',
      stopped: '已停止'
    };
    return labels[status] || status;
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>虛擬教室管理</Typography>
          <Typography variant="body2" color="text.secondary">
            申請 GPU 資源建立教學環境，將 MIG 分割的 GPU 分配給學生使用
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadClassrooms}>
            重新整理
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setDialogOpen(true); }}>
            申請虛擬教室
          </Button>
        </Stack>
      </Stack>

      {/* 統計卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <ClassIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>{classrooms.length}</Typography>
              <Typography variant="body2" color="text.secondary">虛擬教室總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <PlayArrowIcon color="success" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {classrooms.filter(c => c.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">進行中</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <GroupIcon color="info" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {classrooms.reduce((acc, c) => acc + c.students.length, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">學生總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <MemoryIcon color="secondary" sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight={700}>
                {classrooms.reduce((acc, c) => acc + (c.gpuConfig?.totalGpuCount || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">分配 GPU 總數</Typography>
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
                <TableCell>教室名稱</TableCell>
                <TableCell>課程</TableCell>
                <TableCell align="center">GPU 配置</TableCell>
                <TableCell align="center">學生人數</TableCell>
                <TableCell align="center">上課時間</TableCell>
                <TableCell align="center">狀態</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {classrooms.map((classroom) => (
                <TableRow key={classroom.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{classroom.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {classroom.description?.length > 30 ? classroom.description.substring(0, 30) + '...' : classroom.description}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{classroom.courseName}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      icon={<MemoryIcon />}
                      label={`${classroom.gpuConfig?.totalGpuCount || 0} GPU × ${classroom.gpuConfig?.gpuMemoryPerStudent || 0}GB`}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      icon={<GroupIcon />}
                      label={`${classroom.students.length} / ${classroom.maxStudents}`}
                      color={classroom.students.length >= classroom.maxStudents ? 'error' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {classroom.courseStartDate} ~ {classroom.courseEndDate}
                      </Typography>
                      <Typography variant="body2">
                        {classroom.classSchedule?.type === 'weekly' 
                          ? `每週 ${formatWeeklyDays(classroom.classSchedule?.weeklyDays)}`
                          : '單次'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {classroom.classSchedule?.startTime} - {classroom.classSchedule?.endTime}
                      </Typography>
                      {classroom.homeworkSchedule?.enabled && (
                        <Chip size="small" icon={<AssignmentIcon />} label="作業時段" color="secondary" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={getStatusLabel(classroom.status)} color={getStatusColor(classroom.status)} />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看詳情">
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(classroom)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="管理學生">
                        <IconButton size="small" onClick={() => handleManageStudents(classroom)}>
                          <GroupIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {classroom.status === 'scheduled' && (
                        <>
                          <Tooltip title="編輯">
                            <IconButton size="small" onClick={() => handleEditClassroom(classroom)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="開始上課">
                            <IconButton size="small" color="success" onClick={() => handleStartClassroom(classroom.id)}>
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {classroom.status === 'active' && (
                        <Tooltip title="結束上課">
                          <IconButton size="small" color="error" onClick={() => handleStopClassroom(classroom.id)}>
                            <StopIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {classroom.status !== 'active' && (
                        <Tooltip title="刪除">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClassroom(classroom.id)}>
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

      {/* 建立/編輯虛擬教室對話框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ClassIcon color="primary" />
            <span>{selectedClassroom ? '編輯虛擬教室' : '申請虛擬教室'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* 編輯時顯示鎖定警告 */}
            {selectedClassroom && (
              <Alert severity="warning">
                課程期間、排程時段、作業時段等設定在申請時已確定，無法變更。如需調整，請聯繫管理員重新審核。
              </Alert>
            )}

            {/* 基本資訊 */}
            <Typography variant="subtitle1" fontWeight={600}>基本資訊</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="教室名稱"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="課程名稱"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            <TextField
              label="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Divider />

            {/* 課程期間（申請後不可變更） */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={600}>課程期間</Typography>
              {selectedClassroom && <Chip size="small" label="已鎖定" color="warning" variant="outlined" />}
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="課程開始日期"
                  type="date"
                  value={formData.courseStartDate}
                  onChange={(e) => setFormData({ ...formData, courseStartDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  disabled={!!selectedClassroom}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="課程結束日期"
                  type="date"
                  value={formData.courseEndDate}
                  onChange={(e) => setFormData({ ...formData, courseEndDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                  disabled={!!selectedClassroom}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* GPU 資源配置（申請後不可變更） */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={600}>GPU 資源配置</Typography>
              {selectedClassroom && <Chip size="small" label="已鎖定" color="warning" variant="outlined" />}
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="GPU 數量"
                  type="number"
                  value={formData.gpuCount}
                  onChange={(e) => setFormData({ ...formData, gpuCount: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 1, max: 8 }}
                  helperText="教室申請的 GPU 總數"
                  disabled={!!selectedClassroom}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="每位學生 GPU 記憶體 (GB)"
                  type="number"
                  value={formData.gpuMemory}
                  onChange={(e) => setFormData({ ...formData, gpuMemory: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 1, max: 40 }}
                  helperText="MIG 分割後每位學生可用"
                  disabled={!!selectedClassroom}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="學生人數上限"
                  type="number"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) || 0 })}
                  fullWidth
                  inputProps={{ min: 1, max: 100 }}
                  disabled={!!selectedClassroom}
                />
              </Grid>
            </Grid>

            <Divider />

            {/* 上課時段設定（申請後不可變更） */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScheduleIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>上課時段設定</Typography>
              </Stack>
              {selectedClassroom && <Chip size="small" label="已鎖定" color="warning" variant="outlined" />}
            </Stack>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: selectedClassroom ? 'grey.100' : 'transparent' }}>
              <FormControl fullWidth sx={{ mb: 2 }} disabled={!!selectedClassroom}>
                <InputLabel>排程類型</InputLabel>
                <Select
                  value={formData.classScheduleType}
                  label="排程類型"
                  onChange={(e) => setFormData({ ...formData, classScheduleType: e.target.value })}
                >
                  <MenuItem value="once">單次上課</MenuItem>
                  <MenuItem value="weekly">每週固定</MenuItem>
                </Select>
              </FormControl>

              {formData.classScheduleType === 'weekly' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    選擇上課日（可多選）
                  </Typography>
                  <FormGroup row>
                    {weekDayNames.map((dayName, index) => (
                      <FormControlLabel
                        key={index}
                        control={
                          <Checkbox
                            checked={formData.classWeeklyDays.includes(index)}
                            onChange={() => !selectedClassroom && toggleClassWeekDay(index)}
                            color="primary"
                            disabled={!!selectedClassroom}
                          />
                        }
                        label={dayName}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="上課開始時間"
                    type="time"
                    value={formData.classStartTime}
                    onChange={(e) => setFormData({ ...formData, classStartTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    disabled={!!selectedClassroom}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="上課結束時間"
                    type="time"
                    value={formData.classEndTime}
                    onChange={(e) => setFormData({ ...formData, classEndTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    disabled={!!selectedClassroom}
                  />
                </Grid>
              </Grid>
            </Paper>

            <Divider />

            {/* 作業時段設定（可選，申請後不可變更） */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssignmentIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight={600}>作業時段設定（可選）</Typography>
              </Stack>
              {selectedClassroom && <Chip size="small" label="已鎖定" color="warning" variant="outlined" />}
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: selectedClassroom ? 'grey.100' : 'transparent' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.homeworkEnabled}
                    onChange={(e) => setFormData({ ...formData, homeworkEnabled: e.target.checked })}
                    color="secondary"
                    disabled={!!selectedClassroom}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">啟用作業時段</Typography>
                    <Typography variant="caption" color="text.secondary">
                      在課程期間的指定時段開放 GPU 給學生完成作業
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2 }}
              />

              {formData.homeworkEnabled && (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }} disabled={!!selectedClassroom}>
                    <InputLabel>作業時段類型</InputLabel>
                    <Select
                      value={formData.homeworkScheduleType}
                      label="作業時段類型"
                      onChange={(e) => setFormData({ ...formData, homeworkScheduleType: e.target.value })}
                    >
                      <MenuItem value="once">單次</MenuItem>
                      <MenuItem value="weekly">每週固定</MenuItem>
                    </Select>
                  </FormControl>

                  {formData.homeworkScheduleType === 'weekly' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        選擇作業開放日（可多選）
                      </Typography>
                      <FormGroup row>
                        {weekDayNames.map((dayName, index) => (
                          <FormControlLabel
                            key={index}
                            control={
                              <Checkbox
                                checked={formData.homeworkWeeklyDays.includes(index)}
                                onChange={() => !selectedClassroom && toggleHomeworkWeekDay(index)}
                                color="secondary"
                                disabled={!!selectedClassroom}
                              />
                            }
                            label={dayName}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  )}

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <TextField
                        label="作業開始時間"
                        type="time"
                        value={formData.homeworkStartTime}
                        onChange={(e) => setFormData({ ...formData, homeworkStartTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        disabled={!!selectedClassroom}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="作業結束時間"
                        type="time"
                        value={formData.homeworkEndTime}
                        onChange={(e) => setFormData({ ...formData, homeworkEndTime: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        disabled={!!selectedClassroom}
                      />
                    </Grid>
                  </Grid>

                  <Alert severity="info" icon={<MemoryIcon />}>
                    <Typography variant="body2">
                      <strong>GPU 自動分配：</strong>系統將在作業時段自動將課程 GPU 平均分配給所有已加入課程的學生。
                    </Typography>
                  </Alert>
                </>
              )}
            </Paper>

            <Divider />

            {/* Docker 映像檔 */}
            <TextField
              label="Docker 映像檔"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              fullWidth
              placeholder="pytorch/pytorch:2.0-cuda11.7"
              helperText="學生環境使用的 Docker 映像檔"
            />

            {/* 申請預覽 */}
            {!selectedClassroom && formData.classWeeklyDays.length > 0 && (
              <Alert severity="success" icon={<EventRepeatIcon />}>
                <Typography variant="subtitle2">排程預覽</Typography>
                <Typography variant="body2">
                  • 課程期間：{formData.courseStartDate || '未設定'} ~ {formData.courseEndDate || '未設定'}
                </Typography>
                <Typography variant="body2">
                  • 上課時段：每週 {formatWeeklyDays(formData.classWeeklyDays)}，{formData.classStartTime} - {formData.classEndTime}
                </Typography>
                {formData.homeworkEnabled && formData.homeworkWeeklyDays.length > 0 && (
                  <Typography variant="body2">
                    • 作業時段：每週 {formatWeeklyDays(formData.homeworkWeeklyDays)}，{formData.homeworkStartTime} - {formData.homeworkEndTime}（GPU 自動分配）
                  </Typography>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={selectedClassroom ? handleUpdateClassroom : handleCreateClassroom}
            disabled={!formData.name || !formData.courseName || !formData.courseStartDate || !formData.courseEndDate || formData.classWeeklyDays.length === 0}
          >
            {selectedClassroom ? '更新' : '申請'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 教室詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <ClassIcon color="primary" />
              <span>教室詳情</span>
            </Stack>
            <Chip label={getStatusLabel(selectedClassroom?.status)} color={getStatusColor(selectedClassroom?.status)} />
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedClassroom && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>{selectedClassroom.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedClassroom.description}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">課程名稱</Typography>
                    <Typography variant="body2">{selectedClassroom.courseName}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">授課教師</Typography>
                    <Typography variant="body2">{selectedClassroom.teacher?.name}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">建立時間</Typography>
                    <Typography variant="body2">{selectedClassroom.createdAt}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">教室 ID</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedClassroom.id}</Typography>
                      <IconButton size="small" onClick={() => copyToClipboard(selectedClassroom.id)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <MemoryIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>GPU 配置</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">GPU 總數</Typography>
                    <Typography variant="body2">{selectedClassroom.gpuConfig?.totalGpuCount} 張</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">GPU 型號</Typography>
                    <Typography variant="body2">{selectedClassroom.gpuConfig?.gpuType}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">每位學生記憶體</Typography>
                    <Typography variant="body2">{selectedClassroom.gpuConfig?.gpuMemoryPerStudent} GB</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">MIG 啟用</Typography>
                    <Typography variant="body2">{selectedClassroom.gpuConfig?.migEnabled ? '是' : '否'}</Typography>
                  </Grid>
                </Grid>
                {selectedClassroom.gpuConfig?.migPartitions?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      MIG 分割狀態
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedClassroom.gpuConfig.migPartitions.map((mig) => (
                        <Chip
                          key={mig.id}
                          size="small"
                          label={`${mig.size} - ${mig.allocatedTo || '未分配'}`}
                          color={mig.allocatedTo ? 'primary' : 'default'}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <ScheduleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>課程時間設定</Typography>
                  <Chip size="small" label="申請後不可變更" color="warning" variant="outlined" />
                </Stack>
                
                {/* 課程期間 */}
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>課程期間</Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {selectedClassroom.courseStartDate} ~ {selectedClassroom.courseEndDate}
                  </Typography>
                </Box>

                {/* 上課時段 */}
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <ClassIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" color="text.secondary">上課時段</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">排程類型</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedClassroom.classSchedule?.type === 'weekly' ? '每週固定' : '單次上課'}
                      </Typography>
                    </Grid>
                    {selectedClassroom.classSchedule?.type === 'weekly' && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">上課日</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatWeeklyDays(selectedClassroom.classSchedule?.weeklyDays)}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">上課時間</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedClassroom.classSchedule?.startTime} - {selectedClassroom.classSchedule?.endTime}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* 作業時段 */}
                {selectedClassroom.homeworkSchedule?.enabled ? (
                  <Box sx={{ p: 1.5, bgcolor: 'secondary.50', borderRadius: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <AssignmentIcon fontSize="small" color="secondary" />
                      <Typography variant="subtitle2" color="text.secondary">作業時段</Typography>
                      <Chip size="small" label="GPU 自動分配" color="secondary" sx={{ height: 18, fontSize: '0.7rem' }} />
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">排程類型</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedClassroom.homeworkSchedule?.type === 'weekly' ? '每週固定' : '單次'}
                        </Typography>
                      </Grid>
                      {selectedClassroom.homeworkSchedule?.type === 'weekly' && (
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">開放日</Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {formatWeeklyDays(selectedClassroom.homeworkSchedule?.weeklyDays)}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">開放時間</Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedClassroom.homeworkSchedule?.startTime} - {selectedClassroom.homeworkSchedule?.endTime}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                ) : (
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      未啟用作業時段
                    </Typography>
                  </Box>
                )}
              </Paper>

              {selectedClassroom.accessUrl && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">教室存取連結</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {selectedClassroom.accessUrl}
                    </Typography>
                    <IconButton size="small" onClick={() => copyToClipboard(selectedClassroom.accessUrl)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Alert>
              )}

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <GroupIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      學生名單 ({selectedClassroom.students.length} / {selectedClassroom.maxStudents})
                    </Typography>
                  </Stack>
                </Stack>
                {selectedClassroom.students.length > 0 ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedClassroom.students.map((student) => (
                      <Chip
                        key={student.id}
                        label={`${student.name} (${student.email})`}
                        color={student.status === 'active' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">尚無學生</Typography>
                )}
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleManageStudents(selectedClassroom)} startIcon={<GroupIcon />}>
            管理學生
          </Button>
          <Button variant="contained" onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 學生管理對話框 */}
      <Dialog open={studentDialogOpen} onClose={() => setStudentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GroupIcon color="primary" />
            <span>管理學生 - {selectedClassroom?.name}</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>新增學生</Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="學生 Email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleAddStudent}>
                  新增
                </Button>
              </Stack>
            </Paper>

            <Typography variant="subtitle2">
              目前學生 ({selectedClassroom?.students?.length || 0} / {selectedClassroom?.maxStudents})
            </Typography>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>姓名</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell align="center">狀態</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedClassroom?.students?.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={student.status === 'active' ? '已連線' : '離線'}
                          color={student.status === 'active' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleRemoveStudent(student.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!selectedClassroom?.students || selectedClassroom.students.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">尚無學生</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setStudentDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VirtualClassroom;
