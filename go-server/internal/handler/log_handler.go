package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/model"
	"gpu-controller/internal/service"
)

type LogHandler struct {
	logService        *service.LogService
	connectionService service.ConnectionService
	remoteLogger      *service.RemoteLogger
}

func NewLogHandler(logService *service.LogService, connectionService service.ConnectionService, remoteLogger *service.RemoteLogger) *LogHandler {
	return &LogHandler{
		logService:        logService,
		connectionService: connectionService,
		remoteLogger:      remoteLogger,
	}
}

// GetLogs 取得系統日誌
// @Summary 取得系統日誌
// @Description 根據篩選條件取得系統日誌資料
// @Tags logs
// @Accept json
// @Produce json
// @Param level query string false "日誌級別 (info, warning, error, all)"
// @Param startDate query string false "開始日期 (YYYY-MM-DD)"
// @Param endDate query string false "結束日期 (YYYY-MM-DD)"
// @Param search query string false "關鍵字搜尋"
// @Param page query int false "頁碼" default(1)
// @Param pageSize query int false "每頁筆數" default(20)
// @Success 200 {object} model.LogsResponse
// @Failure 400 {object} model.Response
// @Failure 500 {object} model.Response
// @Router /api/logs [get]
func (h *LogHandler) GetLogs(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	// 解析查詢參數
	req := model.LogsRequest{
		Level:     c.DefaultQuery("level", "all"),
		StartDate: c.Query("startDate"),
		EndDate:   c.Query("endDate"),
		Search:    c.Query("search"),
		Page:      1,
		PageSize:  20,
	}

	// 解析頁碼
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			req.Page = page
		}
	}

	// 解析每頁筆數
	if pageSizeStr := c.Query("pageSize"); pageSizeStr != "" {
		if pageSize, err := strconv.Atoi(pageSizeStr); err == nil && pageSize > 0 && pageSize <= 100 {
			req.PageSize = pageSize
		}
	}

	// 取得日誌資料
	result, err := h.logService.FetchLogs(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "取得日誌失敗",
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Data:    result,
		Message: "成功取得日誌資料",
	})
}

// GetLogsPost 使用 POST 方式取得系統日誌
// @Summary 取得系統日誌 (POST)
// @Description 使用 POST 方式根據篩選條件取得系統日誌資料
// @Tags logs
// @Accept json
// @Produce json
// @Param request body model.LogsRequest true "日誌查詢請求"
// @Success 200 {object} model.LogsResponse
// @Failure 400 {object} model.Response
// @Failure 500 {object} model.Response
// @Router /api/logs [post]
func (h *LogHandler) GetLogsPost(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	var req model.LogsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "請求參數格式錯誤",
		})
		return
	}

	// 設定預設值
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 || req.PageSize > 100 {
		req.PageSize = 20
	}
	if req.Level == "" {
		req.Level = "all"
	}

	// 取得日誌資料
	result, err := h.logService.FetchLogs(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Error:   err.Error(),
			Message: "取得日誌失敗",
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Data:    result,
		Message: "成功取得日誌資料",
	})
}

// SendLog 傳送日誌到遠端伺服器
// @Summary 傳送日誌到遠端伺服器
// @Description 將操作日誌傳送到 10.133.77.231 伺服器的 gpu_manager.log
// @Tags logs
// @Accept json
// @Produce json
// @Param request body model.SendLogRequest true "日誌請求"
// @Success 200 {object} model.Response
// @Failure 400 {object} model.Response
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/logs/send [post]
func (h *LogHandler) SendLog(c *gin.Context) {
	var req model.SendLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Response{
			Success: false,
			Message: "請求格式錯誤",
			Error:   err.Error(),
		})
		return
	}

	// 檢查 SSH 連線
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Message: "請先建立 SSH 連線",
			Error:   "未連線到遠端伺服器",
		})
		return
	}

	// 設定預設值
	if req.Source == "" {
		req.Source = "web-frontend"
	}
	if req.User == "" {
		req.User = "web-user"
	}

	// 傳送日誌
	err := h.logService.WriteLogToRemote(req.Level, req.Message, req.Source, req.User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Message: "傳送日誌失敗",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Message: "日誌傳送成功",
	})
}

// SendUserActionLog 傳送使用者操作日誌
// @Summary 傳送使用者操作日誌
// @Description 記錄使用者在系統中的操作行為
// @Tags logs
// @Accept json
// @Produce json
// @Param request body model.UserActionLogRequest true "使用者操作請求"
// @Success 200 {object} model.Response
// @Failure 400 {object} model.Response
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/logs/user-action [post]
func (h *LogHandler) SendUserActionLog(c *gin.Context) {
	var req model.UserActionLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, model.Response{
			Success: false,
			Message: "請求格式錯誤",
			Error:   err.Error(),
		})
		return
	}

	// 檢查 SSH 連線
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Message: "請先建立 SSH 連線",
			Error:   "未連線到遠端伺服器",
		})
		return
	}

	// 傳送使用者操作日誌
	err := h.logService.WriteUserActionLogToRemote(req.User, req.Action, req.Details)
	if err != nil {
		c.JSON(http.StatusInternalServerError, model.Response{
			Success: false,
			Message: "傳送使用者操作日誌失敗",
			Error:   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Message: "使用者操作日誌傳送成功",
	})
}

// TestLog 測試日誌功能
// @Summary 測試日誌功能
// @Description 測試遠端日誌記錄功能
// @Tags logs
// @Accept json
// @Produce json
// @Param message query string false "測試訊息"
// @Success 200 {object} model.Response
// @Failure 500 {object} model.Response
// @Failure 503 {object} model.Response
// @Router /api/logs/test [get]
func (h *LogHandler) TestLog(c *gin.Context) {
	// 檢查連線狀態
	if !h.connectionService.IsConnected() {
		c.JSON(http.StatusServiceUnavailable, model.Response{
			Success: false,
			Error:   "未連線到遠端伺服器",
			Message: "請先建立 SSH 連線",
		})
		return
	}

	// 取得測試訊息
	message := c.DefaultQuery("message", "手動測試日誌功能")

	// 使用 RemoteLogger 記錄測試日誌
	if h.remoteLogger != nil {
		err := h.remoteLogger.Info("admin", "Log Test", message, "test")
		if err != nil {
			c.JSON(http.StatusInternalServerError, model.Response{
				Success: false,
				Error:   err.Error(),
				Message: "日誌測試失敗",
			})
			return
		}
	}

	c.JSON(http.StatusOK, model.Response{
		Success: true,
		Message: fmt.Sprintf("日誌測試成功: %s", message),
	})
}
