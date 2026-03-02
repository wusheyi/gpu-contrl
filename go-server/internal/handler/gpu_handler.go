package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/service"
)

// GPUHandler GPU 處理器
type GPUHandler struct {
	gpuService        service.GPUService
	migService        service.MIGService
	connectionService service.ConnectionService
}

// NewGPUHandler 建立 GPU 處理器
func NewGPUHandler(gpuService service.GPUService, migService service.MIGService, connectionService service.ConnectionService) *GPUHandler {
	return &GPUHandler{
		gpuService:        gpuService,
		migService:        migService,
		connectionService: connectionService,
	}
}

// Status 取得 GPU 狀態
func (h *GPUHandler) Status(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	output, err := h.gpuService.GetStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得 GPU 狀態失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"output":  output,
	})
}

// Metrics 取得 GPU 指標
func (h *GPUHandler) Metrics(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	metrics, err := h.gpuService.GetMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得 GPU 指標失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"gpus":    metrics.GPUs,
		"summary": metrics.Summary,
	})
}

// ShutdownRequest 關閉請求
type ShutdownRequest struct {
	GPUID int `json:"gpu_id"`
}

// Shutdown 關閉 GPU
func (h *GPUHandler) Shutdown(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req ShutdownRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 gpu_id",
		})
		return
	}

	password := h.connectionService.GetPassword()
	result, err := h.migService.ShutdownGPU(req.GPUID, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "關閉 GPU 失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "GPU 關閉操作已完成",
		"data":    result,
	})
}
