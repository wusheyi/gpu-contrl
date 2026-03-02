package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/model"
	"gpu-controller/internal/service"
)

// ContainerHandler 容器處理器
type ContainerHandler struct {
	containerService  service.ContainerService
	connectionService service.ConnectionService
}

// NewContainerHandler 建立容器處理器
func NewContainerHandler(containerService service.ContainerService, connectionService service.ConnectionService) *ContainerHandler {
	return &ContainerHandler{
		containerService:  containerService,
		connectionService: connectionService,
	}
}

// List 列出所有容器
func (h *ContainerHandler) List(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	containers, err := h.containerService.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得容器列表失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"containers": containers,
	})
}

// Ports 取得容器 port 對應
func (h *ContainerHandler) Ports(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	mappings, err := h.containerService.GetPorts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得 port 對應失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"port_mappings": mappings,
	})
}

// StartRequest 啟動容器請求
type StartRequest struct {
	DeviceID int    `json:"device_id"`
	Nums     int    `json:"nums"`
	Image    string `json:"image"`
}

// Start 啟動容器
func (h *ContainerHandler) Start(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req StartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.DeviceID = 0
		req.Nums = 1
		req.Image = "ssh-nvidia:latest"
	}

	if req.Nums <= 0 {
		req.Nums = 1
	}
	if req.Image == "" {
		req.Image = "ssh-nvidia:latest"
	}

	password := h.connectionService.GetPassword()
	result, err := h.containerService.Start(req.DeviceID, req.Nums, req.Image, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "啟動容器失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// StartBatchRequest 批次啟動請求
type StartBatchRequest struct {
	GPUConfigs []model.GPUConfig `json:"gpu_configs"`
	Image      string            `json:"image"`
}

// StartBatch 批次啟動容器
func (h *ContainerHandler) StartBatch(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req StartBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.GPUConfigs) == 0 {
		req.GPUConfigs = []model.GPUConfig{
			{DeviceID: 0, Nums: 7},
			{DeviceID: 1, Nums: 7},
			{DeviceID: 2, Nums: 7},
			{DeviceID: 3, Nums: 7},
		}
	}
	if req.Image == "" {
		req.Image = "ssh-nvidia:latest"
	}

	password := h.connectionService.GetPassword()
	result, err := h.containerService.StartBatch(req.GPUConfigs, req.Image, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "批次啟動失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// StopRequest 停止容器請求
type StopRequest struct {
	ContainerID string `json:"container_id"`
}

// Stop 停止容器
func (h *ContainerHandler) Stop(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req StopRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ContainerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 container_id",
		})
		return
	}

	output, err := h.containerService.Stop(req.ContainerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "停止容器失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "容器已停止",
		"output":  output,
	})
}

// StopBatchRequest 批次停止請求
type StopBatchRequest struct {
	ContainerIDs []string `json:"container_ids"`
}

// StopBatch 批次停止容器
func (h *ContainerHandler) StopBatch(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req StopBatchRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.ContainerIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 container_ids 陣列",
		})
		return
	}

	password := h.connectionService.GetPassword()
	results, err := h.containerService.StopBatch(req.ContainerIDs, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "批次停止失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已停止容器",
		"results": results,
	})
}

// StopAll 停止所有容器
func (h *ContainerHandler) StopAll(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	password := h.connectionService.GetPassword()
	results, err := h.containerService.StopAll(password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "停止所有容器失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "所有容器已停止並移除",
		"results": results,
	})
}
