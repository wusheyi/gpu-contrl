import React, { useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import ClassIcon from '@mui/icons-material/Class';
import PeopleIcon from '@mui/icons-material/People';
import VirtualClassroom from './VirtualClassroom';
import StudentGpuAllocation from './StudentGpuAllocation';

const TeacherPanel = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    { label: '虛擬教室', icon: <ClassIcon /> },
    { label: '學生 GPU 分配', icon: <PeopleIcon /> }
  ];

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              教師控制台
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              虛擬教室管理 · GPU 資源分配給學生
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {currentTab === 0 && <VirtualClassroom />}
          {currentTab === 1 && <StudentGpuAllocation />}
        </Box>
      </Paper>
    </Box>
  );
};

export default TeacherPanel;
