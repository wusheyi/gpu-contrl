package service

import (
	"encoding/json"
	"strings"

	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

// ImageService Docker 映像檔管理服務介面
type ImageService interface {
	List() ([]model.DockerImage, error)
	Pull(imageName string) (string, string, bool)
	Delete(imageID string, force bool) (string, string, bool)
	Inspect(imageID string) (*model.ImageInspectInfo, error)
	Tag(sourceImage, targetImage string) (bool, error)
}

// imageService 映像檔服務實作
type imageService struct {
	sshClient ssh.Executor
}

// NewImageService 建立映像檔服務
func NewImageService(sshClient ssh.Executor) ImageService {
	return &imageService{
		sshClient: sshClient,
	}
}

// List 列出所有映像檔
func (s *imageService) List() ([]model.DockerImage, error) {
	output, _, err := s.sshClient.Execute("docker images --format '{{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.Size}}\t{{.CreatedAt}}'")
	if err != nil {
		return nil, err
	}

	images := make([]model.DockerImage, 0)
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) < 5 {
			continue
		}

		repo := parts[0]
		tag := parts[1]

		// 跳過 <none>
		if strings.Contains(repo, "<none>") || strings.Contains(tag, "<none>") {
			continue
		}

		// 判斷 registry 來源
		registry := "docker.io"
		if strings.HasPrefix(repo, "nvcr.io") {
			registry = "nvcr.io"
		} else if strings.HasPrefix(repo, "harbor.") || strings.Contains(repo, ".edu.tw") {
			registry = strings.Split(repo, "/")[0]
		} else if strings.Contains(repo, "/") && strings.Contains(strings.Split(repo, "/")[0], ".") {
			registry = strings.Split(repo, "/")[0]
		}

		images = append(images, model.DockerImage{
			ID:       parts[2],
			Name:     repo,
			Tag:      tag,
			Size:     parts[3],
			Created:  parts[4],
			Registry: registry,
			FullName: repo + ":" + tag,
		})
	}

	return images, nil
}

// Pull 拉取映像檔
func (s *imageService) Pull(imageName string) (string, string, bool) {
	output, errOutput, _ := s.sshClient.Execute("docker pull " + imageName)

	success := strings.Contains(output, "Pull complete") ||
		strings.Contains(output, "Downloaded newer image") ||
		strings.Contains(output, "Image is up to date")

	return output, errOutput, success
}

// Delete 刪除映像檔
func (s *imageService) Delete(imageID string, force bool) (string, string, bool) {
	cmd := "docker rmi "
	if force {
		cmd += "-f "
	}
	cmd += imageID

	output, errOutput, _ := s.sshClient.Execute(cmd)

	success := strings.Contains(output, "Untagged") ||
		strings.Contains(output, "Deleted") ||
		errOutput == ""

	return output, errOutput, success
}

// Inspect 查看映像檔詳細資訊
func (s *imageService) Inspect(imageID string) (*model.ImageInspectInfo, error) {
	output, _, err := s.sshClient.Execute("docker inspect " + imageID)
	if err != nil {
		return nil, err
	}

	var infoList []map[string]interface{}
	if err := json.Unmarshal([]byte(output), &infoList); err != nil {
		return nil, err
	}

	if len(infoList) == 0 {
		return nil, nil
	}

	info := infoList[0]

	// 解析 Config
	configMap, _ := info["Config"].(map[string]interface{})
	env, _ := toStringSlice(configMap["Env"])
	cmd, _ := toStringSlice(configMap["Cmd"])
	entrypoint, _ := toStringSlice(configMap["Entrypoint"])
	labels, _ := toStringMap(configMap["Labels"])

	// 解析 Layers
	rootFS, _ := info["RootFS"].(map[string]interface{})
	layers, _ := rootFS["Layers"].([]interface{})

	// 取得 ID 前 12 碼
	id, _ := info["Id"].(string)
	if len(id) > 12 {
		id = id[:12]
	}

	size, _ := info["Size"].(float64)

	return &model.ImageInspectInfo{
		ID:           id,
		Created:      getString(info, "Created"),
		Size:         int64(size),
		Architecture: getString(info, "Architecture"),
		OS:           getString(info, "Os"),
		Author:       getString(info, "Author"),
		Config: model.ImageConfigInfo{
			Env:        env,
			Cmd:        cmd,
			Entrypoint: entrypoint,
			Labels:     labels,
		},
		Layers: len(layers),
	}, nil
}

// Tag 新增標籤
func (s *imageService) Tag(sourceImage, targetImage string) (bool, error) {
	_, errOutput, err := s.sshClient.Execute("docker tag " + sourceImage + " " + targetImage)
	success := errOutput == "" || strings.TrimSpace(errOutput) == ""
	return success, err
}

// 輔助函數
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func toStringSlice(val interface{}) ([]string, bool) {
	if val == nil {
		return []string{}, true
	}
	if arr, ok := val.([]interface{}); ok {
		result := make([]string, 0, len(arr))
		for _, v := range arr {
			if s, ok := v.(string); ok {
				result = append(result, s)
			}
		}
		return result, true
	}
	return []string{}, false
}

func toStringMap(val interface{}) (map[string]string, bool) {
	if val == nil {
		return map[string]string{}, true
	}
	if m, ok := val.(map[string]interface{}); ok {
		result := make(map[string]string)
		for k, v := range m {
			if s, ok := v.(string); ok {
				result[k] = s
			}
		}
		return result, true
	}
	return map[string]string{}, false
}
