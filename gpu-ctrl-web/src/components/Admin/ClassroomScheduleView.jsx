import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Card,
  CardContent,
  Grid,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import ClassIcon from '@mui/icons-material/Class';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MemoryIcon from '@mui/icons-material/Memory';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FilterListIcon from '@mui/icons-material/FilterList';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getMigStatus, listContainers, getConnectionStatus } from '../../services/connectorApi';

const ClassroomScheduleView = () => {
  const [loading, setLoading] = useState(true);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [connected, setConnected] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [migInfo, setMigInfo] = useState({});

  // H200 GPU 配置
  const GPU_COUNT = 4;
  const MIG_PER_GPU = 7;
  const GPU_NAME = 'NVIDIA H200';
  const MIG_MEMORY = 10;

  // 時段定義 (參考圖片中的課表格式)
  const timeSlots = [
    { id: '#M', time: '07:10-08:00' },
    { id: '#1', time: '08:10-09:00' },
    { id: '#2', time: '09:10-10:00' },
    { id: '#3', time: '10:10-11:00' },
    { id: '#4', time: '11:10-12:00' },
    { id: '#5', time: '12:10-13:00' },
    { id: '#6', time: '13:30-14:20' },
    { id: '#7', time: '14:30-15:20' },
    { id: '#8', time: '15:30-16:20' },
    { id: '#9', time: '16:30-17:20' },
    { id: '#10', time: '17:30-18:20' },
    { id: '#11', time: '18:30-19:20' },
    { id: '#12', time: '19:25-20:15' },
    { id: '#13', time: '20:20-21:10' },
    { id: '#14', time: '21:15-22:05' }
  ];

  const weekDays = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const weekDayColors = ['#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa', '#fff8e1'];

  useEffect(() => {
    checkConnection();
    loadClassrooms();
  }, []);

  const checkConnection = async () => {
    try {
      const status = await getConnectionStatus();
      setConnected(status.connected || false);
    } catch {
      setConnected(false);
    }
  };

  const loadClassrooms = async () => {
    setLoading(true);
    try {
      const [migData, containerData] = await Promise.all([
        getMigStatus().catch(() => ({ mig_info: {} })),
        listContainers().catch(() => ({ containers: [] }))
      ]);

      setMigInfo(migData.mig_info || {});
      const containers = containerData.containers || [];

      // 將每個 GPU 轉換為教室
      const classroomList = [];
      for (let gpuId = 0; gpuId < GPU_COUNT; gpuId++) {
        const gpuContainers = containers.filter(c => {
          const port = c.ports?.[0]?.host_port || 0;
          return Math.floor(port / 10000) === gpuId;
        });

        const gpuMigInfo = migData.mig_info?.[`GPU ${gpuId}`] || {};
        const usedMigs = gpuMigInfo.mig_devices?.length || 0;

        // 根據星期幾分配課程時間
        const dayIndex = gpuId % 5;
        const classStartSlot = (gpuId % 3) + 1;

        classroomList.push({
          id: `classroom-gpu${gpuId}`,
          name: `H200 GPU ${gpuId} 教室`,
          courseName: `深度學習實作課程 ${gpuId + 1}`,
          teacher: { 
            id: `t00${gpuId + 1}`, 
            name: `教師 ${gpuId + 1}`, 
            email: `teacher${gpuId + 1}@nkust.edu.tw` 
          },
          status: gpuContainers.length > 0 ? 'approved' : (usedMigs > 0 ? 'active' : 'pending'),
          courseStartDate: new Date().toISOString().split('T')[0],
          courseEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          gpuConfig: { 
            totalGpuCount: 1, 
            gpuMemoryPerStudent: MIG_MEMORY,
            gpuName: GPU_NAME,
            migInstances: MIG_PER_GPU,
            usedMigs: usedMigs
          },
          maxStudents: MIG_PER_GPU,
          currentStudents: gpuContainers.length,
          containers: gpuContainers,
          classSchedule: {
            type: 'weekly',
            weeklyDays: [dayIndex],
            startTime: timeSlots[classStartSlot]?.time.split('-')[0] || '09:10',
            endTime: timeSlots[classStartSlot + 2]?.time.split('-')[1] || '12:00'
          },
          homeworkSchedule: {
            enabled: gpuContainers.length > 0,
            type: 'weekly',
            weeklyDays: [(dayIndex + 2) % 7],
            startTime: '18:30',
            endTime: '21:10'
          }
        });
      }

      setClassrooms(classroomList);
      setSnackbar({ open: true, message: '課表資料已載入', severity: 'success' });
    } catch (error) {
      console.error('載入課表失敗:', error);
      setSnackbar({ open: true, message: '載入失敗: ' + error.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: '已複製到剪貼簿', severity: 'success' });
  };

  // 取得狀態標籤
  const getStatusLabel = (status) => {
    const labels = {
      pending: '待審核',
      approved: '已核准',
      rejected: '已拒絕',
      active: '進行中',
      completed: '已結束'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      active: 'info',
      completed: 'default'
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <CheckCircleIcon fontSize="small" />;
      case 'pending':
        return <PendingIcon fontSize="small" />;
      case 'rejected':
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // 將時間轉換為時段索引
  const timeToSlotIndex = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    for (let i = 0; i < timeSlots.length; i++) {
      const [slotStart] = timeSlots[i].time.split('-');
      const [slotHours, slotMinutes] = slotStart.split(':').map(Number);
      const slotTotalMinutes = slotHours * 60 + slotMinutes;
      
      if (totalMinutes <= slotTotalMinutes + 30) {
        return i;
      }
    }
    return timeSlots.length - 1;
  };

  // 計算時段跨度
  const getSlotSpan = (startTime, endTime) => {
    const startIndex = timeToSlotIndex(startTime);
    const endIndex = timeToSlotIndex(endTime);
    return Math.max(1, endIndex - startIndex + 1);
  };

  // 取得特定時段的課程
  const getClassroomsForSlot = (dayIndex, slotIndex) => {
    const filteredClassrooms = classrooms.filter(classroom => {
      // 被拒絕的不顯示
      if (classroom.status === 'rejected') return false;
      if (filterStatus !== 'all' && classroom.status !== filterStatus) return false;
      if (filterTeacher !== 'all' && classroom.teacher.id !== filterTeacher) return false;
      return true;
    });

    const result = [];

    filteredClassrooms.forEach(classroom => {
      // 檢查上課時段
      if (classroom.classSchedule?.weeklyDays?.includes(dayIndex)) {
        const startSlot = timeToSlotIndex(classroom.classSchedule.startTime);
        const endSlot = timeToSlotIndex(classroom.classSchedule.endTime);
        
        if (slotIndex >= startSlot && slotIndex <= endSlot) {
          if (slotIndex === startSlot) {
            result.push({
              ...classroom,
              scheduleType: 'class',
              span: getSlotSpan(classroom.classSchedule.startTime, classroom.classSchedule.endTime)
            });
          } else {
            result.push({ skip: true });
          }
        }
      }

      // 檢查作業時段
      if (classroom.homeworkSchedule?.enabled && classroom.homeworkSchedule?.weeklyDays?.includes(dayIndex)) {
        const startSlot = timeToSlotIndex(classroom.homeworkSchedule.startTime);
        const endSlot = timeToSlotIndex(classroom.homeworkSchedule.endTime);
        
        if (slotIndex >= startSlot && slotIndex <= endSlot) {
          if (slotIndex === startSlot) {
            result.push({
              ...classroom,
              scheduleType: 'homework',
              span: getSlotSpan(classroom.homeworkSchedule.startTime, classroom.homeworkSchedule.endTime)
            });
          } else {
            result.push({ skip: true });
          }
        }
      }
    });

    return result.filter(r => !r.skip);
  };

  // 檢查該時段是否被佔用（用於合併儲存格）
  const isSlotOccupied = (dayIndex, slotIndex) => {
    const filteredClassrooms = classrooms.filter(classroom => {
      // 被拒絕的不顯示
      if (classroom.status === 'rejected') return false;
      if (filterStatus !== 'all' && classroom.status !== filterStatus) return false;
      if (filterTeacher !== 'all' && classroom.teacher.id !== filterTeacher) return false;
      return true;
    });

    for (const classroom of filteredClassrooms) {
      // 檢查上課時段
      if (classroom.classSchedule?.weeklyDays?.includes(dayIndex)) {
        const startSlot = timeToSlotIndex(classroom.classSchedule.startTime);
        const endSlot = timeToSlotIndex(classroom.classSchedule.endTime);
        if (slotIndex > startSlot && slotIndex <= endSlot) {
          return true;
        }
      }
      // 檢查作業時段
      if (classroom.homeworkSchedule?.enabled && classroom.homeworkSchedule?.weeklyDays?.includes(dayIndex)) {
        const startSlot = timeToSlotIndex(classroom.homeworkSchedule.startTime);
        const endSlot = timeToSlotIndex(classroom.homeworkSchedule.endTime);
        if (slotIndex > startSlot && slotIndex <= endSlot) {
          return true;
        }
      }
    }
    return false;
  };

  // 取得所有教師列表
  const getTeachers = () => {
    const teacherMap = new Map();
    classrooms.forEach(c => {
      teacherMap.set(c.teacher.id, c.teacher);
    });
    return Array.from(teacherMap.values());
  };

  // 統計資料
  const stats = {
    total: classrooms.length,
    approved: classrooms.filter(c => c.status === 'approved').length,
    pending: classrooms.filter(c => c.status === 'pending').length,
    rejected: classrooms.filter(c => c.status === 'rejected').length,
    totalGpu: classrooms.filter(c => c.status === 'approved').reduce((acc, c) => acc + (c.gpuConfig?.totalGpuCount || 0), 0),
    totalStudents: classrooms.filter(c => c.status === 'approved').reduce((acc, c) => acc + c.currentStudents, 0)
  };

  const handleViewDetails = (classroom) => {
    setSelectedClassroom(classroom);
    setDetailDialogOpen(true);
  };

  return (
    <Box>
      {/* 標題與篩選 */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            <ClassIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            虛擬教室排程總覽
          </Typography>
          <Typography variant="body2" color="text.secondary">
            以課表形式檢視所有虛擬教室的排程狀況
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadClassrooms}>
            重新整理
          </Button>
        </Stack>
      </Stack>

      {/* 統計卡片 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="primary">{stats.total}</Typography>
              <Typography variant="caption" color="text.secondary">虛擬教室總數</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="success.main">{stats.approved}</Typography>
              <Typography variant="caption" color="text.secondary">已核准</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="warning.main">{stats.pending}</Typography>
              <Typography variant="caption" color="text.secondary">待審核</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="error.main">{stats.rejected}</Typography>
              <Typography variant="caption" color="text.secondary">已拒絕</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="secondary.main">{stats.totalGpu}</Typography>
              <Typography variant="caption" color="text.secondary">分配 GPU</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography variant="h5" fontWeight={700} color="info.main">{stats.totalStudents}</Typography>
              <Typography variant="caption" color="text.secondary">學生總數</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 篩選器 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <FilterListIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>狀態篩選</InputLabel>
            <Select
              value={filterStatus}
              label="狀態篩選"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="approved">已核准</MenuItem>
              <MenuItem value="pending">待審核</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>教師篩選</InputLabel>
            <Select
              value={filterTeacher}
              label="教師篩選"
              onChange={(e) => setFilterTeacher(e.target.value)}
            >
              <MenuItem value="all">全部教師</MenuItem>
              {getTeachers().map(teacher => (
                <MenuItem key={teacher.id} value={teacher.id}>{teacher.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" sx={{ bgcolor: '#1976d2', color: 'white' }} label="上課時段" />
            <Chip size="small" sx={{ bgcolor: '#9c27b0', color: 'white' }} label="作業時段" />
          </Box>
        </Stack>
      </Paper>

      {loading ? (
        <LinearProgress />
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600, width: 100, borderRight: '1px solid', borderColor: 'divider' }}>
                  時段
                </TableCell>
                {weekDays.map((day, index) => (
                  <TableCell 
                    key={index} 
                    align="center" 
                    sx={{ 
                      fontWeight: 600, 
                      bgcolor: weekDayColors[index],
                      borderRight: index < weekDays.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider'
                    }}
                  >
                    {day}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {timeSlots.map((slot, slotIndex) => (
                <TableRow key={slot.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell 
                    sx={{ 
                      fontWeight: 500, 
                      fontSize: '0.75rem',
                      borderRight: '1px solid', 
                      borderColor: 'divider',
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Typography variant="caption" fontWeight={600}>{slot.id}</Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">{slot.time}</Typography>
                  </TableCell>
                  {weekDays.map((_, dayIndex) => {
                    // 如果這個時段被上一個課程佔用，不渲染
                    if (isSlotOccupied(dayIndex, slotIndex)) {
                      return null;
                    }

                    const scheduledItems = getClassroomsForSlot(dayIndex, slotIndex);
                    const maxSpan = scheduledItems.length > 0 ? Math.max(...scheduledItems.map(s => s.span || 1)) : 1;

                    return (
                      <TableCell 
                        key={dayIndex} 
                        align="center"
                        rowSpan={maxSpan}
                        sx={{ 
                          p: 0,
                          verticalAlign: 'stretch',
                          borderRight: dayIndex < weekDays.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          bgcolor: scheduledItems.length > 0 ? 'transparent' : 'inherit',
                          height: scheduledItems.length > 0 ? 'auto' : undefined
                        }}
                      >
                        <Stack spacing={0} sx={{ height: '100%' }}>
                          {scheduledItems.map((item, idx) => (
                            <Tooltip 
                              key={`${item.id}-${item.scheduleType}-${idx}`}
                              title={
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                                  <Typography variant="caption">課程：{item.courseName}</Typography><br />
                                  <Typography variant="caption">教師：{item.teacher.name}</Typography><br />
                                  <Typography variant="caption">
                                    類型：{item.scheduleType === 'class' ? '上課時段' : '作業時段'}
                                  </Typography><br />
                                  <Typography variant="caption">
                                    GPU：{item.gpuConfig?.totalGpuCount} × {item.gpuConfig?.gpuMemoryPerStudent}GB
                                  </Typography><br />
                                  <Typography variant="caption">
                                    學生：{item.currentStudents}/{item.maxStudents}
                                  </Typography>
                                </Box>
                              }
                              arrow
                            >
                              <Paper
                                elevation={0}
                                onClick={() => handleViewDetails(item)}
                                sx={{
                                  p: 1,
                                  cursor: 'pointer',
                                  bgcolor: item.scheduleType === 'class' ? '#1976d2' : '#9c27b0',
                                  color: 'white',
                                  borderRadius: 0,
                                  height: '100%',
                                  minHeight: 50 * (item.span || 1),
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  transition: 'filter 0.1s',
                                  '&:hover': {
                                    filter: 'brightness(1.1)',
                                    boxShadow: 2
                                  },
                                  opacity: item.status === 'pending' ? 0.75 : 1,
                                  border: item.status === 'pending' ? '2px dashed rgba(255,255,255,0.5)' : 'none'
                                }}
                              >
                                <Stack spacing={0.25}>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Chip 
                                      size="small" 
                                      label={item.id.split('-')[1]}
                                      sx={{ 
                                        height: 16, 
                                        fontSize: '0.65rem',
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white'
                                      }} 
                                    />
                                    {item.scheduleType === 'homework' && (
                                      <AssignmentIcon sx={{ fontSize: 12 }} />
                                    )}
                                  </Stack>
                                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                    {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.9 }}>
                                    {item.courseName.length > 15 ? item.courseName.substring(0, 15) + '...' : item.courseName}
                                  </Typography>
                                  <Chip 
                                    size="small"
                                    label={item.teacher.name}
                                    sx={{ 
                                      height: 14, 
                                      fontSize: '0.6rem',
                                      bgcolor: 'rgba(255,255,255,0.3)',
                                      color: 'white',
                                      mt: 0.25
                                    }} 
                                  />
                                </Stack>
                              </Paper>
                            </Tooltip>
                          ))}
                        </Stack>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 圖例說明 */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>圖例說明</Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#1976d2', borderRadius: 0.5 }} />
            <Typography variant="caption">上課時段</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#9c27b0', borderRadius: 0.5 }} />
            <Typography variant="caption">作業時段</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#1976d2', borderRadius: 0.5, opacity: 0.7, border: '2px dashed white' }} />
            <Typography variant="caption">待審核</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#1976d2', borderRadius: 0.5, opacity: 0.4 }} />
            <Typography variant="caption">已拒絕</Typography>
          </Stack>
        </Stack>
      </Paper>

      {/* 詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1}>
              <ClassIcon color="primary" />
              <span>虛擬教室詳情</span>
            </Stack>
            {selectedClassroom && (
              <Chip 
                icon={getStatusIcon(selectedClassroom.status)}
                label={getStatusLabel(selectedClassroom.status)} 
                color={getStatusColor(selectedClassroom.status)} 
                size="small"
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedClassroom && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" fontWeight={600}>{selectedClassroom.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedClassroom.courseName}</Typography>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">授課教師</Typography>
                  <Typography variant="body2">{selectedClassroom.teacher.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{selectedClassroom.teacher.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">課程期間</Typography>
                  <Typography variant="body2">{selectedClassroom.courseStartDate} ~ {selectedClassroom.courseEndDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">學生人數</Typography>
                  <Typography variant="body2">{selectedClassroom.currentStudents} / {selectedClassroom.maxStudents}</Typography>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <MemoryIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2">GPU 配置</Typography>
                </Stack>
                <Typography variant="body2">
                  {selectedClassroom.gpuConfig?.totalGpuCount} GPU × {selectedClassroom.gpuConfig?.gpuMemoryPerStudent}GB / 學生
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <EventIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2">上課時段</Typography>
                </Stack>
                <Typography variant="body2">
                  每週 {selectedClassroom.classSchedule?.weeklyDays?.map(d => weekDays[d]).join('、')}
                </Typography>
                <Typography variant="body2">
                  {selectedClassroom.classSchedule?.startTime} - {selectedClassroom.classSchedule?.endTime}
                </Typography>
              </Paper>

              {selectedClassroom.homeworkSchedule?.enabled && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f3e5f5' }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <AssignmentIcon color="secondary" fontSize="small" />
                    <Typography variant="subtitle2">作業時段</Typography>
                  </Stack>
                  <Typography variant="body2">
                    每週 {selectedClassroom.homeworkSchedule?.weeklyDays?.map(d => weekDays[d]).join('、')}
                  </Typography>
                  <Typography variant="body2">
                    {selectedClassroom.homeworkSchedule?.startTime} - {selectedClassroom.homeworkSchedule?.endTime}
                  </Typography>
                </Paper>
              )}

              {/* 顯示容器資訊 */}
              {selectedClassroom.containers?.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    運行中的容器 ({selectedClassroom.containers.length})
                  </Typography>
                  {selectedClassroom.containers.map((container, idx) => {
                    const port = container.ports?.[0]?.host_port || 0;
                    const sshCmd = `ssh ai@10.133.77.231 -p ${port}`;
                    return (
                      <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {container.names?.[0] || container.id?.slice(0, 12)}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="caption" color="text.secondary">
                            {sshCmd}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(sshCmd)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })}
                </Paper>
              )}

              {selectedClassroom.status === 'pending' && (
                <Alert severity="warning">
                  此虛擬教室申請尚待審核，請前往審核頁面處理。
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {selectedClassroom?.status === 'pending' && (
            <>
              <Button color="error">拒絕申請</Button>
              <Button variant="contained" color="success">核准申請</Button>
            </>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar 通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassroomScheduleView;
