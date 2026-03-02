import React from 'react';
import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

const Home = ({ username }) => {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight={600}>
          使用者資訊
        </Typography>
        <Typography variant="body2" color="text.secondary">
          以下為目前登入帳號的概要資訊。
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%'
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  基本資料
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  帳號
                </Typography>
                <Typography variant="body1">{username}</Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  角色
                </Typography>
                <Typography variant="body1">一般使用者</Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  狀態
                </Typography>
                <Chip label="啟用中" color="success" size="small" />
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: '100%'
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ShieldIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  權限摘要
                </Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  GPU 配額
                </Typography>
                <Typography variant="body1">2 台 / 24 小時</Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  儲存空間
                </Typography>
                <Typography variant="body1">500 GB</Typography>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  服務層級
                </Typography>
                <Typography variant="body1">標準</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Stack spacing={2} direction={{ xs: 'column', md: 'row' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <EventAvailableIcon color="secondary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  近期活動
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                最近登入時間：剛剛
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default Home;
