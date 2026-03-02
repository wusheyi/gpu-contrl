import React, { useState } from 'react';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import FolderIcon from '@mui/icons-material/Folder';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ProjectManagement from './ProjectManagement';
import ExperimentScheduling from './ExperimentScheduling';

const LabPanel = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const tabs = [
    { label: '專案管理', icon: <FolderIcon /> },
    { label: '實驗排程', icon: <ScheduleIcon /> }
  ];

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScienceIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              實驗室控制台
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              專案管理 · 實驗排程申請
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
          {currentTab === 0 && <ProjectManagement />}
          {currentTab === 1 && <ExperimentScheduling />}
        </Box>
      </Paper>
    </Box>
  );
};

export default LabPanel;
