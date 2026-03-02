import React, { useEffect, useRef, useState } from 'react';
import { keyframes } from '@emotion/react';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import logo from '../../assets/nkust-ai-logo.jpg';

const DEFAULT_USERNAME = 'demo_user';
const DEFAULT_PASSWORD = 'demo_user';

// 管理員帳號
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

// 教師帳號
const TEACHER_USERNAME = 'teacher';
const TEACHER_PASSWORD = 'teacher';

// 實驗室帳號
const LAB_USERNAME = 'lab';
const LAB_PASSWORD = 'lab';

const lineDraw = keyframes`
  from { stroke-dashoffset: 720; }
  to { stroke-dashoffset: 0; }
`;

const crestRipple = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
  30% { opacity: 0.4; }
  100% { transform: translate(-50%, -50%) scale(1.7); opacity: 0; }
`;

const crestReveal = keyframes`
  0% { opacity: 0; transform: scale(0.98); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: scale(1); }
`;

const fadeOut = keyframes`
  to { opacity: 0; }
`;

const Login = ({ onLogin, mode, onToggleTheme }) => {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isTransitioning) {
      return;
    }
    setError('');
    const normalizedUsername = username.trim();

    // 檢查管理員帳號
    if (normalizedUsername === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsTransitioning(true);
      timerRef.current = setTimeout(() => {
        onLogin(normalizedUsername, 'admin');
      }, 780);
    } else if (normalizedUsername === TEACHER_USERNAME && password === TEACHER_PASSWORD) {
      setIsTransitioning(true);
      timerRef.current = setTimeout(() => {
        onLogin(normalizedUsername, 'teacher');
      }, 780);
    } else if (normalizedUsername === LAB_USERNAME && password === LAB_PASSWORD) {
      setIsTransitioning(true);
      timerRef.current = setTimeout(() => {
        onLogin(normalizedUsername, 'lab');
      }, 780);
    } else if (normalizedUsername === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      setIsTransitioning(true);
      timerRef.current = setTimeout(() => {
        onLogin(normalizedUsername, 'user');
      }, 780);
    } else {
      setError('帳號或密碼錯誤。');
    }
  };

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background:
          theme.palette.mode === 'light'
            ? 'radial-gradient(900px circle at 15% 20%, rgba(47, 75, 138, 0.12), transparent 55%), linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)'
            : 'radial-gradient(900px circle at 15% 20%, rgba(47, 75, 138, 0.2), transparent 55%), linear-gradient(180deg, #0A0F1E 0%, #10192B 100%)'
      })}
    >
      {isTransitioning && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${fadeOut} 120ms ease 660ms forwards`
          }}
        >
          <Box sx={{ position: 'relative', width: 240, height: 240 }}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: `${crestReveal} 520ms ease forwards`
              }}
            >
              <Box
                component="img"
                src={logo}
                alt="NKUST GPU Campus"
                sx={{ width: 160, height: 160, objectFit: 'contain' }}
              />
            </Box>
            <Box
              component="svg"
              viewBox="0 0 200 200"
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%'
              }}
            >
              <path
                d="M100 24 C66 24 42 42 42 72 C42 96 58 116 82 124 L100 134 L118 124 C142 116 158 96 158 72 C158 42 134 24 100 24 Z"
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="720"
                strokeDashoffset="720"
                style={{ animation: `${lineDraw} 520ms ease forwards` }}
              />
              <path
                d="M70 84 L100 58 L130 84"
                fill="none"
                stroke={theme.palette.primary.main}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="200"
                strokeDashoffset="200"
                style={{ animation: `${lineDraw} 520ms ease 60ms forwards` }}
              />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: `1px solid ${theme.palette.primary.main}`,
                animation: `${crestRipple} 520ms ease 140ms forwards`
              }}
            />
          </Box>
        </Box>
      )}

      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  component="img"
                  src={logo}
                  alt="NKUST GPU Campus"
                  sx={{ width: 40, height: 40, objectFit: 'contain' }}
                />
                <Typography variant="h5" fontWeight={600}>
                  NKUST GPU Campus
                </Typography>
              </Stack>
              <Tooltip title={mode === 'light' ? '切換為深色模式' : '切換為淺色模式'}>
                <IconButton
                  onClick={onToggleTheme}
                  color="inherit"
                  aria-label="切換顏色模式"
                >
                  {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                </IconButton>
              </Tooltip>
            </Stack>

            <Typography variant="body2" color="text.secondary">
              請登入以管理 GPU 資源與筆記本環境。
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <TextField
                label="帳號"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="請輸入帳號"
                autoComplete="username"
                fullWidth
                required
                disabled={isTransitioning}
              />
              <TextField
                label="密碼"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="請輸入密碼"
                autoComplete="current-password"
                fullWidth
                required
                disabled={isTransitioning}
              />
              <Typography variant="caption" color="text.secondary">
                測試帳號：admin,demo_user,teacher,lab
              </Typography>
              <Button
                type="submit"
                variant="contained"
                color="secondary"
                size="large"
                disabled={isTransitioning}
              >
                登入
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
