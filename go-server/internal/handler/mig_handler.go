package handler

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/service"
)

// MIGHandler MIG 處理器
type MIGHandler struct {
	migService        service.MIGService
	connectionService service.ConnectionService
	logService        *service.LogService
}

// NewMIGHandler 建立 MIG 處理器
func NewMIGHandler(migService service.MIGService, connectionService service.ConnectionService, logService *service.LogService) *MIGHandler {
	return &MIGHandler{
		migService:        migService,
		connectionService: connectionService,
		logService:        logService,
	}
}

// Status 取得 MIG 狀態
func (h *MIGHandler) Status(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	status, err := h.migService.GetStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得 MIG 狀態失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"raw_output": status.RawOutput,
		"mig_info":   status.MIGInfo,
		"mig_modes":  status.MIGModes,
	})
}

// MIGRequest MIG 請求
type MIGRequest struct {
	GPUIDs  []int  `json:"gpu_ids"`
	Profile string `json:"profile"`
}

// Enable 啟用 MIG
func (h *MIGHandler) Enable(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req MIGRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.GPUIDs) == 0 {
		req.GPUIDs = []int{0, 1, 2, 3}
	}

	password := h.connectionService.GetPassword()
	results, err := h.migService.Enable(req.GPUIDs, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "啟用 MIG 失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "MIG 權限已開啟",
		"results": results,
	})

	// 記錄成功的MIG啟用操作到日誌
	if err = h.logService.WriteSystemLogToRemote("INFO", "MIG權限啟用", fmt.Sprintf("GPU IDs: %v", req.GPUIDs)); err != nil {
		// 日誌錯誤不影響主要操作，僅記錄到控制台
		log.Printf("記錄MIG啟用日誌失敗: %v", err)
	}
}

// Partition MIG 分割
func (h *MIGHandler) Partition(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req MIGRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.GPUIDs) == 0 {
		req.GPUIDs = []int{0, 1, 2, 3}
	}
	if req.Profile == "" {
		req.Profile = "19,19,19,19,19,19,19"
	}

	password := h.connectionService.GetPassword()
	results, err := h.migService.Partition(req.GPUIDs, req.Profile, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "MIG 分割失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "MIG 分割完成",
		"results": results,
	})

	// 記錄成功的MIG分割操作到日誌
	if err = h.logService.WriteSystemLogToRemote("INFO", "MIG分割完成", fmt.Sprintf("GPU IDs: %v, Profile: %s", req.GPUIDs, req.Profile)); err != nil {
		log.Printf("記錄MIG分割日誌失敗: %v", err)
	}
}

// FullSetup 完整 MIG 設定
func (h *MIGHandler) FullSetup(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req MIGRequest
	if err := c.ShouldBindJSON(&req); err != nil || len(req.GPUIDs) == 0 {
		req.GPUIDs = []int{0, 1, 2, 3}
	}

	password := h.connectionService.GetPassword()
	results, err := h.migService.FullSetup(req.GPUIDs, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "MIG 設定失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "MIG 完整設定完成",
		"gpu_ids": req.GPUIDs,
		"results": results,
	})

	// 記錄成功的MIG完整設定操作到日誌
	if err = h.logService.WriteSystemLogToRemote("INFO", "MIG完整設定完成", fmt.Sprintf("GPU IDs: %v", req.GPUIDs)); err != nil {
		log.Printf("記錄MIG完整設定日誌失敗: %v", err)
	}
}

// Cleanup 清理 MIG
func (h *MIGHandler) Cleanup(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	password := h.connectionService.GetPassword()
	results, err := h.migService.Cleanup(password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "清理失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "MIG 清理完成",
		"results": results,
	})

	// 記錄成功的MIG清理操作到日誌
	if err = h.logService.WriteSystemLogToRemote("INFO", "MIG清理完成", "清理所有MIG設定"); err != nil {
		log.Printf("記錄MIG清理日誌失敗: %v", err)
	}
}

// DeleteInstanceRequest 刪除實例請求
type DeleteInstanceRequest struct {
	GPUID int `json:"gpu_id"`
	GIID  int `json:"gi_id"`
}

// DeleteInstance 刪除單一 MIG 實例
func (h *MIGHandler) DeleteInstance(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req DeleteInstanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 gpu_id 和 gi_id",
		})
		return
	}

	password := h.connectionService.GetPassword()
	results, err := h.migService.DeleteInstance(req.GPUID, req.GIID, password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "刪除失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已刪除 MIG 實例",
		"gpu_id":  req.GPUID,
		"gi_id":   req.GIID,
		"results": results,
	})

	// 記錄成功的MIG實例刪除操作到日誌
	if err = h.logService.WriteSystemLogToRemote("INFO", "MIG實例刪除", fmt.Sprintf("GPU ID: %d, GI ID: %d", req.GPUID, req.GIID)); err != nil {
		log.Printf("記錄MIG實例刪除日誌失敗: %v", err)
	}
}
