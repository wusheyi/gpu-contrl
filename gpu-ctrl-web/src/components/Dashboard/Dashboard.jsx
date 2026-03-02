import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ScienceIcon from '@mui/icons-material/Science';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SchoolIcon from '@mui/icons-material/School';
import BiotechIcon from '@mui/icons-material/Biotech';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import logo from '../../assets/nkust-ai-logo.jpg';

const Dashboard = ({ username, userRole, onLogout, mode, onToggleTheme }) => {
  const drawerWidth = 240;
  const collapsedWidth = 72;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const navItems = [
    { id: 'home', label: '首頁', to: '/', icon: <DashboardIcon /> },
    { id: 'demo_test', label: 'demo_test', to: '/demo_test', icon: <ScienceIcon /> },
    ...(userRole === 'teacher' ? [{ id: 'teacher', label: '教師控制台', to: '/teacher', icon: <SchoolIcon /> }] : []),
    ...(userRole === 'lab' ? [{ id: 'lab', label: '實驗室控制台', to: '/lab', icon: <BiotechIcon /> }] : []),
    ...(userRole === 'admin' ? [{ id: 'admin', label: '管理員', to: '/admin', icon: <AdminPanelSettingsIcon /> }] : [])
  ];

  const handleDrawerToggle = () => {
    setMobileOpen((prevOpen) => !prevOpen);
  };

  const handleCollapseToggle = () => {
    setIsCollapsed((prev) => !prev);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ p: 2, justifyContent: isCollapsed ? 'center' : 'space-between' }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            component="img"
            src={logo}
            alt="NKUST GPU Campus"
            sx={{ width: 40, height: 40, objectFit: 'contain' }}
          />
          {!isCollapsed && (
            <Typography variant="subtitle1" fontWeight={600}>
              NKUST GPU Campus
            </Typography>
          )}
        </Stack>
        <IconButton
          onClick={handleCollapseToggle}
          size="small"
          sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          aria-label={isCollapsed ? '展開側邊攔' : '收合側邊攔'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Stack>
      <Divider />
      <List sx={{ p: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.id}
            component={NavLink}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => (isActive ? 'active' : '')}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              '&.active': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 'auto' : 40 }}>
              {item.icon}
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary={item.label} />}
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2, textAlign: isCollapsed ? 'center' : 'left' }}>
        <Typography variant="caption" color="text.secondary">
          狀態：已準備計算
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        minHeight: '100vh',
        background:
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            : 'linear-gradient(180deg, #0A0F1E 0%, #10192B 100%)'
      })}
    >
      <Box
        component="nav"
        sx={{ width: { md: isCollapsed ? collapsedWidth : drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: isCollapsed ? collapsedWidth : drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              transition: 'width 220ms ease'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: `calc(100% - ${isCollapsed ? collapsedWidth : drawerWidth}px)`
          },
          py: 4,
          transition: 'width 220ms ease'
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              mb: 4
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton
                  onClick={handleDrawerToggle}
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                  aria-label="開啟導覽"
                >
                  <MenuIcon />
                </IconButton>
                <Box
                  component="img"
                  src={logo}
                  alt="NKUST GPU Campus"
                  sx={{ width: 40, height: 40, objectFit: 'contain' }}
                />
                <Box>
                  <Typography variant="h5" fontWeight={600}>
                    GPU 控制面板
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    高效能運算存取
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  目前登入：{username}
                </Typography>
                <Tooltip title={mode === 'light' ? '切換為深色模式' : '切換為淺色模式'}>
                  <IconButton
                    onClick={onToggleTheme}
                    color="inherit"
                    aria-label="切換顏色模式"
                  >
                    {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                  </IconButton>
                </Tooltip>
                <Button variant="outlined" color="primary" onClick={onLogout}>
                  登出
                </Button>
              </Stack>
            </Stack>
          </Paper>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default Dashboard;
