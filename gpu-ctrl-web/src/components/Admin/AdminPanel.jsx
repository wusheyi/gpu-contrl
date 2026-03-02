import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MemoryIcon from '@mui/icons-material/Memory';
import TuneIcon from '@mui/icons-material/Tune';
import ArticleIcon from '@mui/icons-material/Article';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import StorageIcon from '@mui/icons-material/Storage';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ClassIcon from '@mui/icons-material/Class';
import UserManagement from './UserManagement';
import GpuMonitor from './GpuMonitor';
import QuotaManagement from './QuotaManagement';
import SystemLogs from './SystemLogs';
import JobScheduling from './JobScheduling';
import ResourceAllocation from './ResourceAllocation';
import ImageManagement from './ImageManagement';
import GrafanaMonitor from './GrafanaMonitor';
import ClassroomScheduleView from './ClassroomScheduleView';

const AdminPanel = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const tabs = [
    { label: '使用者管理', icon: <PeopleIcon />, component: <UserManagement /> },
    { label: 'GPU 監控', icon: <MemoryIcon />, component: <GpuMonitor /> },
    { label: '配額管理', icon: <TuneIcon />, component: <QuotaManagement /> },
    { label: '虛擬教室總覽', icon: <ClassIcon />, component: <ClassroomScheduleView /> },
    { label: '任務排程', icon: <ScheduleIcon />, component: <JobScheduling /> },
    { label: '資源分配', icon: <ViewModuleIcon />, component: <ResourceAllocation /> },
    { label: '映像檔管理', icon: <StorageIcon />, component: <ImageManagement /> },
    { label: '可視化監控', icon: <DashboardIcon />, component: <GrafanaMonitor /> },
    { label: '系統日誌', icon: <ArticleIcon />, component: <SystemLogs /> }
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
        管理員控制台
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理使用者、監控 GPU 資源、設定配額與查看系統日誌。
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          mb: 3
        }}
      >
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 56,
              textTransform: 'none'
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Paper>

      <Box>{tabs[currentTab].component}</Box>
    </Box>
  );
};

export default AdminPanel;
