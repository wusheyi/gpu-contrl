package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/service"
)

// ConnectionHandler 連線處理器
type ConnectionHandler struct {
	service service.ConnectionService
}

// NewConnectionHandler 建立連線處理器
func NewConnectionHandler(service service.ConnectionService) *ConnectionHandler {
	return &ConnectionHandler{service: service}
}

// ConnectRequest 連線請求
type ConnectRequest struct {
	Hostname string `json:"hostname"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// Connect 建立連線
func (h *ConnectionHandler) Connect(c *gin.Context) {
	var req ConnectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// 使用預設配置
		if err := h.service.ConnectWithDefaults(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "連線失敗: " + err.Error(),
			})
			return
		}
	} else {
		// 檢查是否提供了自訂配置
		if req.Hostname != "" {
			if err := h.service.Connect(req.Hostname, req.Username, req.Password); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "連線失敗: " + err.Error(),
				})
				return
			}
		} else {
			if err := h.service.ConnectWithDefaults(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "連線失敗: " + err.Error(),
				})
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "連線成功",
	})
}

// Disconnect 斷開連線
func (h *ConnectionHandler) Disconnect(c *gin.Context) {
	h.service.Disconnect()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已斷開連線",
	})
}

// Status 檢查連線狀態
func (h *ConnectionHandler) Status(c *gin.Context) {
	connected := h.service.IsConnected()
	hostname := ""
	if connected {
		hostname = h.service.GetHostname()
	}

	c.JSON(http.StatusOK, gin.H{
		"connected": connected,
		"hostname":  hostname,
	})
}
