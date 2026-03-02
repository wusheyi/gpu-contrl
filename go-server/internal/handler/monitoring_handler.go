package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/model"
	"gpu-controller/internal/service"
)

type MonitoringHandler struct {
	monitoringService *service.MonitoringService
	connectionService service.ConnectionService
}

func NewMonitoringHandler(monitoringService *service.MonitoringService, connectionService service.ConnectionService) *MonitoringHandler {
	return &MonitoringHandler{
		monitoringService: monitoringService,
		connectionService: connectionService,
	}
}

// GetMonitoringStatus 取得監控服務狀態
// @Summary 取得監控服務狀態
// @Description 檢查 Grafana、Loki、Promtail 容器運行狀態
// @Tags monitoring
// @Accept json
// @Produce json
// @Success 200 {object} model.MonitoringStatus
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/monitoring/status [get]
func (h *MonitoringHandler) GetMonitoringStatus(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	// 取得監控服務狀態
	status, err := h.monitoringService.GetMonitoringStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "取得監控服務狀態失敗",
		})
		return
	}

	// 轉換為前端期望的格式
	frontendStatus := map[string]interface{}{
		"containers": []map[string]interface{}{
			{
				"name":   status.Grafana.Name,
				"port":   3000,
				"status": status.Grafana.State,
			},
			{
				"name":   status.Loki.Name,
				"port":   3100,
				"status": status.Loki.State,
			},
			{
				"name":   status.Promtail.Name,
				"port":   nil,
				"status": status.Promtail.State,
			},
		},
		"overall_status": func() string {
			if status.AllRunning {
				return "running"
			}
			if status.Grafana.State == "unknown" && status.Loki.State == "unknown" && status.Promtail.State == "unknown" {
				return "unknown"
			}
			return "partial"
		}(),
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Data:    frontendStatus,
		Message: "成功取得監控服務狀態",
	})
}

// StartMonitoringServices 啟動監控服務
// @Summary 啟動監控服務
// @Description 啟動指定的監控服務容器
// @Tags monitoring
// @Accept json
// @Produce json
// @Param request body model.MonitoringStartRequest true "啟動請求"
// @Success 200 {object} model.Response
// @Failure 400 {object} model.Response
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/monitoring/start [post]
func (h *MonitoringHandler) StartMonitoringServices(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	var req model.MonitoringStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "請求參數格式錯誤",
		})
		return
	}

	// 啟動監控服務
	err := h.monitoringService.StartMonitoringServices(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "啟動監控服務失敗",
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Message: "成功啟動監控服務",
	})
}

// StartMonitoringStack 啟動完整監控堆疊
// @Summary 啟動完整監控堆疊
// @Description 使用 docker-compose 啟動完整的監控堆疊
// @Tags monitoring
// @Accept json
// @Produce json
// @Success 200 {object} model.Response
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/monitoring/start-stack [post]
func (h *MonitoringHandler) StartMonitoringStack(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	// 啟動監控堆疊
	err := h.monitoringService.StartMonitoringStack()
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "啟動監控堆疊失敗",
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Message: "成功啟動監控堆疊",
	})
}
