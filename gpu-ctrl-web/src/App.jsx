import React, { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, CssBaseline, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import Home from './components/Home/Home';
import DemoTest from './components/DemoTest/DemoTest';
import { AdminPanel } from './components/Admin';
import { TeacherPanel } from './components/Teacher';
import { LabPanel } from './components/Lab';
import './styles/global.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [mode, setMode] = useState('light');

  const handleLogin = (user, role = 'user') => {
    setUsername(user);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUsername('');
    setUserRole('user');
    setIsAuthenticated(false);
  };

  const handleToggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'light' ? '#2F4B8A' : '#9AB6E6' },
          secondary: { main: mode === 'light' ? '#3E6EB5' : '#86A9E0' },
          background: {
            default: mode === 'light' ? '#FFFFFF' : '#0A0F1E',
            paper: mode === 'light' ? '#FFFFFF' : '#131B2B'
          },
          text: {
            primary: mode === 'light' ? '#111827' : '#E7EFFA',
            secondary: mode === 'light' ? '#374151' : '#A8B6D4'
          },
          divider: mode === 'light' ? '#E5E7EB' : '#25304A'
        },
        typography: {
          fontFamily: '"Fira Sans", "Segoe UI", sans-serif',
          button: { textTransform: 'none', fontWeight: 600 }
        },
        shape: { borderRadius: 12 },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: { backgroundImage: 'none' }
            }
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                color: mode === 'light' ? '#2D3E5F' : '#A8B6D4'
              }
            }
          },
          MuiOutlinedInput: {
            styleOverrides: {
              notchedOutline: {
                borderColor: mode === 'light' ? '#C7D2E3' : '#2B355C'
              }
            }
          },
          MuiButton: {
            styleOverrides: {
              contained: {
                backgroundColor: mode === 'light' ? '#2F4B8A' : '#7F9ED6',
                color: mode === 'light' ? '#F9FAFB' : '#0A0F1E',
                '&:hover': {
                  backgroundColor: mode === 'light' ? '#243B6E' : '#6D8BC7'
                }
              },
              outlined: {
                borderColor: mode === 'light' ? '#2F4B8A' : '#7F9ED6',
                color: mode === 'light' ? '#2F4B8A' : '#E7EFFA',
                '&:hover': {
                  borderColor: mode === 'light' ? '#243B6E' : '#6D8BC7',
                  backgroundColor:
                    mode === 'light'
                      ? 'rgba(47, 75, 138, 0.1)'
                      : 'rgba(127, 158, 214, 0.12)'
                }
              }
            }
          }
        }
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1 }}>
          {isAuthenticated ? (
            <BrowserRouter>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard
                      username={username}
                      userRole={userRole}
                      onLogout={handleLogout}
                      mode={mode}
                      onToggleTheme={handleToggleTheme}
                    />
                  }
                >
                  <Route index element={<Home username={username} />} />
                  <Route path="demo_test" element={<DemoTest username={username} />} />
                  {userRole === 'teacher' && (
                    <Route path="teacher" element={<TeacherPanel />} />
                  )}
                  {userRole === 'lab' && (
                    <Route path="lab" element={<LabPanel />} />
                  )}
                  {userRole === 'admin' && (
                    <Route path="admin" element={<AdminPanel />} />
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          ) : (
            <Login onLogin={handleLogin} mode={mode} onToggleTheme={handleToggleTheme} />
          )}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ py: 2, textAlign: 'center' }}
        >
          © 2026 NKUST GPU Campus ·{' '}
          <Box
            component="a"
            href="https://www.nkust.edu.tw/"
            target="_blank"
            rel="noreferrer"
            sx={{ color: 'inherit', textDecoration: 'none' }}
          >
            National Kaohsiung University of Science and Technology
          </Box>
        </Typography>
      </Box>
    </ThemeProvider>
  );
};

export default App;
