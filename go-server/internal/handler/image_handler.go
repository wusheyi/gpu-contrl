package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gpu-controller/internal/service"
)

// ImageHandler 映像檔處理器
type ImageHandler struct {
	imageService      service.ImageService
	connectionService service.ConnectionService
}

// NewImageHandler 建立映像檔處理器
func NewImageHandler(imageService service.ImageService, connectionService service.ConnectionService) *ImageHandler {
	return &ImageHandler{
		imageService:      imageService,
		connectionService: connectionService,
	}
}

// List 列出所有映像檔
func (h *ImageHandler) List(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	images, err := h.imageService.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "取得映像檔列表失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"images":  images,
		"total":   len(images),
	})
}

// Inspect 查看映像檔詳細資訊
func (h *ImageHandler) Inspect(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	imageID := c.Query("image_id")
	if imageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 image_id",
		})
		return
	}

	info, err := h.imageService.Inspect(imageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查詢映像檔失敗: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": info != nil,
		"image":   info,
	})
}

// PullRequest 拉取映像檔請求
type PullRequest struct {
	ImageName string `json:"image_name"`
}

// Pull 拉取映像檔
func (h *ImageHandler) Pull(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req PullRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ImageName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 image_name",
		})
		return
	}

	output, errOutput, success := h.imageService.Pull(req.ImageName)

	msg := "拉取成功"
	if !success {
		msg = "拉取失敗"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": msg,
		"output":  output,
		"error":   errOutput,
	})
}

// DeleteRequest 刪除映像檔請求
type DeleteRequest struct {
	ImageID string `json:"image_id"`
	Force   bool   `json:"force"`
}

// Delete 刪除映像檔
func (h *ImageHandler) Delete(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req DeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ImageID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 image_id",
		})
		return
	}

	output, errOutput, success := h.imageService.Delete(req.ImageID, req.Force)

	msg := "刪除成功"
	if !success {
		msg = "刪除失敗"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": msg,
		"output":  output,
		"error":   errOutput,
	})
}

// TagRequest 標籤請求
type TagRequest struct {
	SourceImage string `json:"source_image"`
	TargetImage string `json:"target_image"`
}

// Tag 新增標籤
func (h *ImageHandler) Tag(c *gin.Context) {
	if err := h.connectionService.EnsureConnection(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "SSH 連線失敗",
		})
		return
	}

	var req TagRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.SourceImage == "" || req.TargetImage == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "請提供 source_image 和 target_image",
		})
		return
	}

	success, _ := h.imageService.Tag(req.SourceImage, req.TargetImage)

	msg := "標籤新增成功"
	if !success {
		msg = "標籤新增失敗"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": msg,
	})
}
