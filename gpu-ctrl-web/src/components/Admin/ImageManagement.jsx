import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import {
  getImagesList,
  pullDockerImage,
  deleteDockerImage,
  inspectDockerImage,
  tagDockerImage,
  getConnectionStatus
} from '../../services/connectorApi';

const ImageManagement = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [pullDialogOpen, setPullDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [pullForm, setPullForm] = useState({
    registry: 'docker.io',
    imageName: '',
    tag: 'latest'
  });
  const [hubSearchResults, setHubSearchResults] = useState([]);
  const [hubSearchLoading, setHubSearchLoading] = useState(false);

  // 模擬本地映像檔資料
  const mockImages = [
    {
      id: 'sha256:abc123',
      name: 'pytorch/pytorch',
      tag: '2.0-cuda11.7-cudnn8-runtime',
      size: 8547000000,
      created: '2026-01-20 10:00:00',
      registry: 'docker.io',
      architecture: 'amd64',
      os: 'linux',
      labels: {
        'maintainer': 'pytorch',
        'cuda.version': '11.7'
      }
    },
    {
      id: 'sha256:def456',
      name: 'tensorflow/tensorflow',
      tag: '2.15.0-gpu',
      size: 6234000000,
      created: '2026-01-18 14:30:00',
      registry: 'docker.io',
      architecture: 'amd64',
      os: 'linux',
      labels: {
        'maintainer': 'tensorflow'
      }
    },
    {
      id: 'sha256:ghi789',
      name: 'nvcr.io/nvidia/tritonserver',
      tag: '24.01-py3',
      size: 12800000000,
      created: '2026-01-15 09:00:00',
      registry: 'nvcr.io',
      architecture: 'amd64',
      os: 'linux',
      labels: {
        'com.nvidia.tritonserver.version': '2.42.0'
      }
    },
    {
      id: 'sha256:jkl012',
      name: 'huggingface/transformers-pytorch-gpu',
      tag: 'latest',
      size: 9100000000,
      created: '2026-01-22 16:45:00',
      registry: 'docker.io',
      architecture: 'amd64',
      os: 'linux',
      labels: {}
    },
    {
      id: 'sha256:mno345',
      name: 'harbor.nkust.edu.tw/ml/custom-pytorch',
      tag: 'v1.0',
      size: 10200000000,
      created: '2026-01-24 11:20:00',
      registry: 'harbor.nkust.edu.tw',
      architecture: 'amd64',
      os: 'linux',
      labels: {
        'author': 'nkust-ml-team'
      }
    }
  ];

  // 模擬 Harbor 私有映像檔
  const mockHarborImages = [
    {
      id: 'harbor-001',
      name: 'harbor.nkust.edu.tw/ml/yolov8-training',
      tag: 'v2.1',
      size: 7800000000,
      created: '2026-01-23 09:00:00',
      registry: 'harbor.nkust.edu.tw',
      isPrivate: true,
      project: 'ml'
    },
    {
      id: 'harbor-002',
      name: 'harbor.nkust.edu.tw/nlp/bert-finetune',
      tag: 'latest',
      size: 5400000000,
      created: '2026-01-21 15:30:00',
      registry: 'harbor.nkust.edu.tw',
      isPrivate: true,
      project: 'nlp'
    },
    {
      id: 'harbor-003',
      name: 'harbor.nkust.edu.tw/cv/segmentation-base',
      tag: 'v1.2',
      size: 6700000000,
      created: '2026-01-19 12:00:00',
      registry: 'harbor.nkust.edu.tw',
      isPrivate: true,
      project: 'cv'
    }
  ];

  // 模擬 Docker Hub 搜尋結果
  const mockHubResults = [
    {
      name: 'nvidia/cuda',
      description: 'CUDA is a parallel computing platform and programming model developed by NVIDIA',
      stars: 2500,
      official: false,
      automated: true
    },
    {
      name: 'pytorch/pytorch',
      description: 'PyTorch is a deep learning framework',
      stars: 1800,
      official: false,
      automated: true
    },
    {
      name: 'tensorflow/tensorflow',
      description: 'An Open Source Machine Learning Framework',
      stars: 3200,
      official: false,
      automated: true
    }
  ];

  // 連線狀態和操作通知
  const [isConnected, setIsConnected] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadImages();
  }, [currentTab]);

  const loadImages = async () => {
    setLoading(true);
    try {
      // 檢查連線狀態
      const statusRes = await getConnectionStatus();
      setIsConnected(statusRes.connected);
      
      if (statusRes.connected) {
        // 取得真實 Docker images
        const result = await getImagesList();
        if (result.success && result.images) {
          // 轉換格式
          const formattedImages = result.images.map(img => ({
            id: img.id,
            name: img.name,
            tag: img.tag,
            size: img.size,
            created: img.created,
            registry: img.registry,
            fullName: img.fullName,
            architecture: 'amd64',
            os: 'linux'
          }));
          setImages(formattedImages);
        } else {
          setImages([]);
        }
      } else {
        // 未連線時使用模擬數據
        if (currentTab === 0) {
          setImages(mockImages);
        } else {
          setImages(mockHarborImages);
        }
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
      setSnackbar({ open: true, message: '載入映像檔失敗: ' + error.message, severity: 'error' });
      // 發生錯誤時使用模擬數據
      setImages(currentTab === 0 ? mockImages : mockHarborImages);
    }
    setLoading(false);
  };

  const handlePullImage = async () => {
    setActionLoading('pull');
    try {
      let fullImageName = pullForm.imageName;
      // 如果不包含 registry，加上 registry
      if (!fullImageName.includes('/') && pullForm.registry !== 'docker.io') {
        fullImageName = `${pullForm.registry}/${fullImageName}`;
      }
      // 加上 tag
      if (!fullImageName.includes(':')) {
        fullImageName = `${fullImageName}:${pullForm.tag}`;
      }
      
      const result = await pullDockerImage(fullImageName);
      
      if (result.success) {
        setSnackbar({ open: true, message: `映像檔 ${fullImageName} 拉取成功`, severity: 'success' });
        setPullDialogOpen(false);
        setPullForm({ registry: 'docker.io', imageName: '', tag: 'latest' });
        loadImages();
      } else {
        setSnackbar({ open: true, message: result.message || '拉取失敗', severity: 'error' });
      }
    } catch (error) {
      console.error('Failed to pull image:', error);
      setSnackbar({ open: true, message: '拉取映像檔失敗: ' + error.message, severity: 'error' });
    }
    setActionLoading('');
  };

  const handleDeleteImage = async (imageId, imageName) => {
    if (window.confirm(`確定要刪除映像檔 ${imageName || imageId} 嗎？此操作無法復原。`)) {
      setActionLoading(`delete-${imageId}`);
      try {
        const result = await deleteDockerImage(imageId);
        
        if (result.success) {
          setSnackbar({ open: true, message: '映像檔已刪除', severity: 'success' });
          loadImages();
        } else {
          setSnackbar({ open: true, message: result.message || '刪除失敗', severity: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete image:', error);
        setSnackbar({ open: true, message: '刪除映像檔失敗: ' + error.message, severity: 'error' });
      }
      setActionLoading('');
    }
  };

  const handleSearchDockerHub = async () => {
    if (!searchQuery.trim()) return;
    setHubSearchLoading(true);
    try {
      // Docker Hub 搜尋目前使用模擬數據
      setHubSearchResults(mockHubResults.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } catch (error) {
      console.error('Failed to search Docker Hub:', error);
    }
    setHubSearchLoading(false);
  };

  const handleViewDetails = async (image) => {
    setSelectedImage(image);
    setDetailDialogOpen(true);
    
    // 如果已連線，嘗試取得更詳細的資訊
    if (isConnected && image.id) {
      try {
        const result = await inspectDockerImage(image.id);
        if (result.success && result.image) {
          setSelectedImage({
            ...image,
            ...result.image
          });
        }
      } catch (error) {
        console.error('Failed to inspect image:', error);
      }
    }
  };

  const handleCopyCommand = (imageName, tag) => {
    const command = `docker pull ${imageName}:${tag}`;
    navigator.clipboard.writeText(command);
  };

  const formatSize = (bytes) => {
    const gb = bytes / 1000000000;
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    const mb = bytes / 1000000;
    return `${mb.toFixed(2)} MB`;
  };

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={600}>
            映像檔管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理 Docker Hub 與私有 Harbor 映像檔
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadImages}
          >
            重新整理
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={() => setPullDialogOpen(true)}
          >
            拉取映像檔
          </Button>
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PublicIcon />} iconPosition="start" label="本地映像檔" />
          <Tab icon={<StorageIcon />} iconPosition="start" label="Harbor 私有倉庫" />
          <Tab icon={<SearchIcon />} iconPosition="start" label="Docker Hub 搜尋" />
        </Tabs>
      </Paper>

      {/* 搜尋欄 */}
      <TextField
        fullWidth
        placeholder={currentTab === 2 ? "搜尋 Docker Hub 映像檔..." : "搜尋映像檔..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && currentTab === 2 && handleSearchDockerHub()}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: currentTab === 2 && (
            <InputAdornment position="end">
              <Button onClick={handleSearchDockerHub} disabled={hubSearchLoading}>
                搜尋
              </Button>
            </InputAdornment>
          )
        }}
        sx={{ mb: 3 }}
      />

      {loading ? (
        <LinearProgress />
      ) : currentTab === 2 ? (
        // Docker Hub 搜尋結果
        <Grid container spacing={2}>
          {hubSearchResults.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  輸入關鍵字搜尋 Docker Hub 映像檔
                </Typography>
              </Paper>
            </Grid>
          ) : (
            hubSearchResults.map((result, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {result.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {result.description}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`⭐ ${result.stars}`} />
                          {result.official && <Chip size="small" label="官方" color="primary" />}
                          {result.automated && <Chip size="small" label="自動建置" variant="outlined" />}
                        </Stack>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CloudDownloadIcon />}
                        onClick={() => {
                          setPullForm({
                            registry: 'docker.io',
                            imageName: result.name,
                            tag: 'latest'
                          });
                          setPullDialogOpen(true);
                        }}
                      >
                        拉取
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      ) : (
        // 本地或 Harbor 映像檔列表
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>映像檔名稱</TableCell>
                <TableCell>標籤</TableCell>
                <TableCell>大小</TableCell>
                <TableCell>建立時間</TableCell>
                <TableCell>來源</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredImages.map((image) => (
                <TableRow key={image.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {image.isPrivate ? (
                        <LockIcon fontSize="small" color="action" />
                      ) : (
                        <PublicIcon fontSize="small" color="action" />
                      )}
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {image.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={image.tag} variant="outlined" />
                  </TableCell>
                  <TableCell>{formatSize(image.size)}</TableCell>
                  <TableCell>{image.created}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={image.registry}
                      color={image.registry.includes('harbor') ? 'secondary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="查看詳情">
                        <IconButton size="small" onClick={() => handleViewDetails(image)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="複製拉取指令">
                        <IconButton size="small" onClick={() => handleCopyCommand(image.name, image.tag)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="刪除">
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteImage(image.id, `${image.name}:${image.tag}`)}
                          disabled={actionLoading === `delete-${image.id}`}
                        >
                          {actionLoading === `delete-${image.id}` ? (
                            <CircularProgress size={18} />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filteredImages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">沒有找到映像檔</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 拉取映像檔對話框 */}
      <Dialog open={pullDialogOpen} onClose={() => setPullDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CloudDownloadIcon />
            <span>拉取映像檔</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>映像檔倉庫</InputLabel>
              <Select
                value={pullForm.registry}
                label="映像檔倉庫"
                onChange={(e) => setPullForm({ ...pullForm, registry: e.target.value })}
              >
                <MenuItem value="docker.io">Docker Hub (docker.io)</MenuItem>
                <MenuItem value="nvcr.io">NVIDIA NGC (nvcr.io)</MenuItem>
                <MenuItem value="harbor.nkust.edu.tw">Harbor (harbor.nkust.edu.tw)</MenuItem>
                <MenuItem value="ghcr.io">GitHub Container Registry (ghcr.io)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="映像檔名稱"
              value={pullForm.imageName}
              onChange={(e) => setPullForm({ ...pullForm, imageName: e.target.value })}
              placeholder="例如: pytorch/pytorch"
              fullWidth
              required
            />
            <TextField
              label="標籤 (Tag)"
              value={pullForm.tag}
              onChange={(e) => setPullForm({ ...pullForm, tag: e.target.value })}
              placeholder="latest"
              fullWidth
            />
            <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary">
                完整映像檔名稱：
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {pullForm.registry}/{pullForm.imageName}:{pullForm.tag || 'latest'}
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPullDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handlePullImage}
            disabled={!pullForm.imageName}
            startIcon={<CloudDownloadIcon />}
          >
            拉取
          </Button>
        </DialogActions>
      </Dialog>

      {/* 映像檔詳情對話框 */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>映像檔詳情</DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">名稱</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {selectedImage.name}:{selectedImage.tag}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">ID</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedImage.id}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">大小</Typography>
                  <Typography variant="body2">{formatSize(selectedImage.size)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">建立時間</Typography>
                  <Typography variant="body2">{selectedImage.created}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">架構</Typography>
                  <Typography variant="body2">{selectedImage.architecture}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">作業系統</Typography>
                  <Typography variant="body2">{selectedImage.os}</Typography>
                </Grid>
              </Grid>
              {selectedImage.labels && Object.keys(selectedImage.labels).length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    標籤
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(selectedImage.labels).map(([key, value]) => (
                      <Chip
                        key={key}
                        size="small"
                        label={`${key}: ${value}`}
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">拉取指令</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                    docker pull {selectedImage.name}:{selectedImage.tag}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleCopyCommand(selectedImage.name, selectedImage.tag)}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* 操作通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ImageManagement;
