import React from 'react';
import {
  Avatar,
  AvatarGroup,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
 

// fake data
const projects = [
  {
    id: 'proj-001',
    name: '視覺模型優化',
    status: '進行中',
    startDate: '2026-01-10',
    endDate: '2026-03-30',
    members: ['吳小明', '林怡君', '陳大仁', '趙美玲'],
    containers: 6,
    gpuQuota: '8 / 16'
  },
  {
    id: 'proj-002',
    name: '智慧排程引擎',
    status: '規劃中',
    startDate: '2026-02-01',
    endDate: '2026-04-15',
    members: ['王志豪', '高雅雯', '張博凱'],
    containers: 3,
    gpuQuota: '4 / 12'
  },
  {
    id: 'proj-003',
    name: '節能推論服務',
    status: '已結案',
    startDate: '2025-11-05',
    endDate: '2026-01-05',
    members: ['許柏翰', '周依辰'],
    containers: 2,
    gpuQuota: '0 / 8'
  }
];

const statusColor = (status) => {
  switch (status) {
    case '進行中':
      return 'success';
    case '規劃中':
      return 'warning';
    case '已結案':
      return 'default';
    default:
      return 'info';
  }
};

const ProjectManage = () => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          專案管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          專案列表與資源配置概覽
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card
              variant="outlined"
              sx={{ height: '100%', minHeight: 320, borderRadius: 0, borderColor: 'divider' }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>
                        {project.name}
                      </Typography>
                      <Chip
                        label={project.status}
                        color={statusColor(project.status)}
                        size="small"
                      />
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="編輯">
                        <IconButton size="small" aria-label="編輯專案">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="申請延期">
                        <IconButton size="small" aria-label="申請延期">
                          <CalendarTodayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        起始日
                      </Typography>
                      <Typography variant="body2">{project.startDate}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        結束日
                      </Typography>
                      <Typography variant="body2">{project.endDate}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        容器數量
                      </Typography>
                      <Typography variant="body2">{project.containers}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        GPU 額度
                      </Typography>
                      <Typography variant="body2">{project.gpuQuota}</Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      成員
                    </Typography>
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
                      {project.members.map((member) => (
                        <Avatar key={member} sx={{ bgcolor: 'secondary.main', fontSize: 12 }}>
                          {member.slice(0, 1)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default ProjectManage;



