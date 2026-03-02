package service

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"gpu-controller/internal/config"
	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

// ContainerService 容器管理服務介面
type ContainerService interface {
	List() ([]model.Container, error)
	GetPorts() ([]map[string]string, error)
	Start(deviceID, nums int, image string, password string) (map[string]interface{}, error)
	StartBatch(gpuConfigs []model.GPUConfig, image string, password string) (map[string]interface{}, error)
	Stop(containerID string) (string, error)
	StopBatch(containerIDs []string, password string) ([]ssh.CommandResult, error)
	StopAll(password string) ([]ssh.CommandResult, error)
}

// containerService 容器服務實作
type containerService struct {
	sshClient    ssh.Executor
	config       *config.Config
	migService   MIGService
	remoteLogger *RemoteLogger
}

// NewContainerService 建立容器服務
func NewContainerService(sshClient ssh.Executor, config *config.Config, migService MIGService, remoteLogger *RemoteLogger) ContainerService {
	return &containerService{
		sshClient:    sshClient,
		config:       config,
		migService:   migService,
		remoteLogger: remoteLogger,
	}
}

// List 列出所有容器
func (s *containerService) List() ([]model.Container, error) {
	output, _, err := s.sshClient.Execute("docker ps --format '{{.ID}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'")
	if err != nil {
		return nil, err
	}

	containers := make([]model.Container, 0)
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) >= 4 {
			containers = append(containers, model.Container{
				ID:     parts[0],
				Image:  parts[1],
				Ports:  parts[2],
				Status: parts[3],
			})
		}
	}

	return containers, nil
}

// GetPorts 取得容器對應的 port 資訊
func (s *containerService) GetPorts() ([]map[string]string, error) {
	output, _, err := s.sshClient.Execute("docker ps --format '{{.ID}}\t{{.Ports}}'")
	if err != nil {
		return nil, err
	}

	mappings := make([]map[string]string, 0)
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			mappings = append(mappings, map[string]string{
				"container_id": parts[0],
				"ports":        parts[1],
			})
		}
	}

	return mappings, nil
}

// getUsedPortsForGPU 取得某個 GPU 已使用的 port 列表
func (s *containerService) getUsedPortsForGPU(deviceID int) []int {
	output, _, _ := s.sshClient.Execute("docker ps --format '{{.Ports}}'")

	portRangeStart := deviceID*10000 + 1
	portRangeEnd := portRangeStart + 9999

	usedPorts := make([]int, 0)
	re := regexp.MustCompile(`:(\d+)->22`)

	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		matches := re.FindAllStringSubmatch(line, -1)
		for _, match := range matches {
			if len(match) >= 2 {
				port, _ := strconv.Atoi(match[1])
				if port >= portRangeStart && port <= portRangeEnd {
					usedPorts = append(usedPorts, port)
				}
			}
		}
	}

	sort.Ints(usedPorts)
	return usedPorts
}

// getUsedMIGInstances 取得已使用的 MIG 實例
func (s *containerService) getUsedMIGInstances(deviceID int) []int {
	usedPorts := s.getUsedPortsForGPU(deviceID)
	portBase := deviceID*10000 + 1

	instances := make([]int, 0)
	for _, port := range usedPorts {
		instanceID := port - portBase
		if instanceID >= 0 && instanceID < 7 {
			instances = append(instances, instanceID)
		}
	}

	return instances
}

// findAvailableSlots 找到可用的 port 和 MIG instance
func (s *containerService) findAvailableSlots(deviceID, numsNeeded int) []map[string]int {
	usedInstances := s.getUsedMIGInstances(deviceID)
	portBase := deviceID*10000 + 1

	usedSet := make(map[int]bool)
	for _, inst := range usedInstances {
		usedSet[inst] = true
	}

	slots := make([]map[string]int, 0)
	for i := 0; i < 7; i++ {
		if !usedSet[i] {
			slots = append(slots, map[string]int{
				"instance_id": i,
				"port":        portBase + i,
			})
			if len(slots) >= numsNeeded {
				break
			}
		}
	}

	return slots
}

// Start 啟動容器
func (s *containerService) Start(deviceID, nums int, image string, password string) (map[string]interface{}, error) {
	// 記錄開始操作
	if s.remoteLogger != nil {
		s.remoteLogger.Info("admin", "Container Start",
			fmt.Sprintf("Starting %d containers on GPU %d with image %s", nums, deviceID, image), "container")
	}

	if image == "" {
		image = "ssh-nvidia:latest"
	}
	if nums <= 0 {
		nums = 1
	}

	// 檢查 MIG 狀態
	migModes, _ := s.migService.GetMIGModes()
	migInfo, _ := s.migService.GetMIGInfo(migModes)

	gpuMIGEnabled := migModes[deviceID]
	gpuHasInstances := len(migInfo[deviceID].Instances) > 0

	commands := make([]string, 0)
	ports := make([]int, 0)
	migMode := "Full GPU"

	if gpuMIGEnabled && gpuHasInstances {
		// MIG 模式
		migMode = "MIG"
		if s.remoteLogger != nil {
			s.remoteLogger.Info("admin", "Container Start",
				fmt.Sprintf("Using MIG mode for GPU %d", deviceID), "container")
		}

		availableSlots := s.findAvailableSlots(deviceID, nums)

		if len(availableSlots) < nums {
			errMsg := fmt.Sprintf("GPU %d 只有 %d 個可用的 MIG instance，無法啟動 %d 個容器", deviceID, len(availableSlots), nums)
			if s.remoteLogger != nil {
				s.remoteLogger.Warning("admin", "Container Start", errMsg, "container")
			}
			return map[string]interface{}{
				"success":   false,
				"message":   errMsg,
				"available": len(availableSlots),
			}, nil
		}

		for _, slot := range availableSlots {
			port := slot["port"]
			instanceID := slot["instance_id"]
			ports = append(ports, port)
			commands = append(commands, fmt.Sprintf("docker run --rm -d --gpus 'device=%d:%d' -p %d:22 %s", deviceID, instanceID, port, image))
		}
	} else {
		// 整個 GPU 模式
		if s.remoteLogger != nil {
			s.remoteLogger.Info("admin", "Container Start",
				fmt.Sprintf("Using full GPU mode for GPU %d", deviceID), "container")
		}

		usedPorts := s.getUsedPortsForGPU(deviceID)
		usedSet := make(map[int]bool)
		for _, p := range usedPorts {
			usedSet[p] = true
		}

		portBase := deviceID*10000 + 1
		for i := 0; i < nums; i++ {
			port := portBase + i
			for usedSet[port] || contains(ports, port) {
				port++
			}
			ports = append(ports, port)
			commands = append(commands, fmt.Sprintf("docker run --rm -d --gpus \"device=%d\" -p %d:22 %s", deviceID, port, image))
		}
	}

	// 執行容器啟動命令
	results := s.sshClient.ExecuteCommands(commands, password)

	// 檢查執行結果並記錄日誌
	successCount := 0
	for _, result := range results {
		if result.Error == "" {
			successCount++
		}
	}

	if s.remoteLogger != nil {
		if successCount == len(commands) {
			portsStr := fmt.Sprintf("%v", ports)
			s.remoteLogger.Info("admin", "Container Start",
				fmt.Sprintf("Successfully started %d containers on GPU %d, ports: %s, mode: %s",
					successCount, deviceID, portsStr, migMode), "container")
		} else {
			s.remoteLogger.Warning("admin", "Container Start",
				fmt.Sprintf("Started %d/%d containers on GPU %d", successCount, len(commands), deviceID), "container")
		}
	}

	return map[string]interface{}{
		"success":   true,
		"message":   fmt.Sprintf("已啟動 %d 個容器", nums),
		"device_id": deviceID,
		"ports":     ports,
		"mig_mode":  migMode,
		"results":   results,
	}, nil
}

// StartBatch 批次啟動容器
func (s *containerService) StartBatch(gpuConfigs []model.GPUConfig, image string, password string) (map[string]interface{}, error) {
	if image == "" {
		image = "ssh-nvidia:latest"
	}

	// 檢查 MIG 狀態
	migModes, _ := s.migService.GetMIGModes()
	migInfo, _ := s.migService.GetMIGInfo(migModes)

	allCommands := make([]string, 0)
	allPorts := make(map[string][]int)
	gpuModes := make(map[string]string)
	warnings := make([]string, 0)

	for _, config := range gpuConfigs {
		deviceID := config.DeviceID
		nums := config.Nums
		gpuKey := fmt.Sprintf("GPU_%d", deviceID)

		gpuMIGEnabled := migModes[deviceID]
		gpuHasInstances := len(migInfo[deviceID].Instances) > 0

		ports := make([]int, 0)

		if gpuMIGEnabled && gpuHasInstances {
			gpuModes[gpuKey] = "MIG"
			availableSlots := s.findAvailableSlots(deviceID, nums)

			if len(availableSlots) < nums {
				warnings = append(warnings, fmt.Sprintf("GPU %d: 只有 %d 個可用 MIG instance", deviceID, len(availableSlots)))
			}

			for _, slot := range availableSlots {
				port := slot["port"]
				instanceID := slot["instance_id"]
				ports = append(ports, port)
				allCommands = append(allCommands, fmt.Sprintf("docker run --rm -d --gpus 'device=%d:%d' -p %d:22 %s", deviceID, instanceID, port, image))
			}
		} else {
			gpuModes[gpuKey] = "Full GPU"
			usedPorts := s.getUsedPortsForGPU(deviceID)
			usedSet := make(map[int]bool)
			for _, p := range usedPorts {
				usedSet[p] = true
			}

			portBase := deviceID*10000 + 1
			for i := 0; i < nums; i++ {
				port := portBase + i
				for usedSet[port] || contains(ports, port) {
					port++
				}
				ports = append(ports, port)
				allCommands = append(allCommands, fmt.Sprintf("docker run --rm -d --gpus \"device=%d\" -p %d:22 %s", deviceID, port, image))
			}
		}

		allPorts[gpuKey] = ports
	}

	results := s.sshClient.ExecuteCommands(allCommands, password)

	response := map[string]interface{}{
		"success":   true,
		"message":   "已批次啟動容器",
		"ports":     allPorts,
		"gpu_modes": gpuModes,
		"results":   results,
	}

	if len(warnings) > 0 {
		response["warnings"] = warnings
	}

	return response, nil
}

// Stop 停止單一容器
func (s *containerService) Stop(containerID string) (string, error) {
	// 記錄停止操作
	if s.remoteLogger != nil {
		s.remoteLogger.Info("admin", "Container Stop",
			fmt.Sprintf("Stopping container %s", containerID), "container")
	}

	output, _, err := s.sshClient.Execute(fmt.Sprintf("docker stop %s", containerID))

	if err != nil {
		if s.remoteLogger != nil {
			s.remoteLogger.Error("admin", "Container Stop",
				fmt.Sprintf("Failed to stop container %s: %v", containerID, err), "container")
		}
	} else {
		if s.remoteLogger != nil {
			s.remoteLogger.Info("admin", "Container Stop",
				fmt.Sprintf("Successfully stopped container %s", containerID), "container")
		}
	}

	return output, err
}

// StopBatch 批次停止容器
func (s *containerService) StopBatch(containerIDs []string, password string) ([]ssh.CommandResult, error) {
	commands := make([]string, len(containerIDs))
	for i, cid := range containerIDs {
		commands[i] = fmt.Sprintf("docker stop %s", cid)
	}
	return s.sshClient.ExecuteCommands(commands, password), nil
}

// StopAll 停止所有容器（排除監控容器）
func (s *containerService) StopAll(password string) ([]ssh.CommandResult, error) {
	// 排除監控相關容器: monitoring-grafana-1, monitoring-loki-1, monitoring-promtail-1
	// Docker 不支援 name!= 過濾器，改用 grep -v 排除
	commands := []string{
		"docker ps -a --format '{{.ID}} {{.Names}}' | grep -v 'monitoring-' | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true",
		"docker ps -a --format '{{.ID}} {{.Names}}' | grep -v 'monitoring-' | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true",
	}
	return s.sshClient.ExecuteCommands(commands, password), nil
}

// contains 檢查 slice 是否包含元素
func contains(slice []int, val int) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}
