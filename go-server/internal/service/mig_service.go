package service

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"gpu-controller/internal/config"
	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

// MIGService MIG 管理服務介面
type MIGService interface {
	GetStatus() (*model.MIGStatusResponse, error)
	GetMIGModes() (map[int]bool, error)
	GetMIGInfo(migModes map[int]bool) (map[int]*model.MIGInfo, error)
	Enable(gpuIDs []int, password string) ([]ssh.CommandResult, error)
	Partition(gpuIDs []int, profile string, password string) ([]ssh.CommandResult, error)
	FullSetup(gpuIDs []int, password string) ([]ssh.CommandResult, error)
	Cleanup(password string) ([]ssh.CommandResult, error)
	DeleteInstance(gpuID, giID int, password string) ([]ssh.CommandResult, error)
	ShutdownGPU(gpuID int, password string) (map[string]interface{}, error)
}

// migService MIG 服務實作
type migService struct {
	sshClient    ssh.Executor
	config       *config.Config
	remoteLogger *RemoteLogger
}

// NewMIGService 建立 MIG 服務
func NewMIGService(sshClient ssh.Executor, config *config.Config, remoteLogger *RemoteLogger) MIGService {
	return &migService{
		sshClient:    sshClient,
		config:       config,
		remoteLogger: remoteLogger,
	}
}

// GetStatus 取得 MIG 狀態
func (s *migService) GetStatus() (*model.MIGStatusResponse, error) {
	// 取得 MIG 模式
	migModes, err := s.GetMIGModes()
	if err != nil {
		return nil, err
	}

	// 取得完整 nvidia-smi 輸出
	output, _, err := s.sshClient.Execute("nvidia-smi")
	if err != nil {
		return nil, err
	}

	// 解析 MIG 資訊
	migInfo, _ := s.GetMIGInfo(migModes)

	return &model.MIGStatusResponse{
		RawOutput: output,
		MIGInfo:   migInfo,
		MIGModes:  migModes,
	}, nil
}

// GetMIGModes 取得各 GPU 的 MIG 模式狀態
func (s *migService) GetMIGModes() (map[int]bool, error) {
	output, _, err := s.sshClient.Execute("nvidia-smi --query-gpu=index,mig.mode.current --format=csv,noheader")
	if err != nil {
		return nil, err
	}

	modes := make(map[int]bool)
	lines := strings.Split(strings.TrimSpace(output), "\n")

	for _, line := range lines {
		if !strings.Contains(line, ",") {
			continue
		}
		parts := strings.Split(line, ",")
		if len(parts) >= 2 {
			gpuID, err := strconv.Atoi(strings.TrimSpace(parts[0]))
			if err != nil {
				continue
			}
			mode := strings.ToLower(strings.TrimSpace(parts[1]))
			modes[gpuID] = mode == "enabled"
		}
	}

	return modes, nil
}

// GetMIGInfo 解析 MIG 實例資訊
func (s *migService) GetMIGInfo(migModes map[int]bool) (map[int]*model.MIGInfo, error) {
	info := make(map[int]*model.MIGInfo)

	// 初始化所有 GPU
	for i := 0; i < 4; i++ {
		info[i] = &model.MIGInfo{
			Instances:  make([]model.MIGInstance, 0),
			Total:      0,
			Used:       0,
			MIGEnabled: migModes[i],
		}
	}

	output, _, err := s.sshClient.Execute("nvidia-smi")
	if err != nil {
		return info, err
	}

	// 解析 MIG devices 區段
	inMIGSection := false
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		if strings.Contains(line, "MIG devices:") {
			inMIGSection = true
			continue
		}
		if strings.Contains(line, "Processes:") {
			inMIGSection = false
			continue
		}

		if inMIGSection && strings.Contains(line, "|") {
			// 跳過標題行
			if strings.Contains(line, "=") || strings.Contains(line, "+") ||
				(strings.Contains(line, "GPU") && strings.Contains(line, "GI")) ||
				strings.Contains(line, "ID") {
				continue
			}

			parts := strings.Split(line, "|")
			if len(parts) >= 2 {
				cell := strings.TrimSpace(parts[1])
				nums := strings.Fields(cell)

				if len(nums) >= 2 {
					gpuID, err1 := strconv.Atoi(nums[0])
					giID, err2 := strconv.Atoi(nums[1])

					if err1 == nil && err2 == nil {
						if gpuInfo, ok := info[gpuID]; ok {
							gpuInfo.Instances = append(gpuInfo.Instances, model.MIGInstance{
								GIID:      giID,
								Name:      fmt.Sprintf("MIG Instance %d", giID),
								Placement: strconv.Itoa(len(gpuInfo.Instances)),
							})
							gpuInfo.Total++
						}
					}
				}
			}
		}
	}

	return info, nil
}

// Enable 啟用 MIG 模式
func (s *migService) Enable(gpuIDs []int, password string) ([]ssh.CommandResult, error) {
	commands := make([]string, len(gpuIDs))
	for i, gpuID := range gpuIDs {
		commands[i] = fmt.Sprintf("sudo nvidia-smi -i %d -mig 1", gpuID)
	}
	return s.sshClient.ExecuteCommands(commands, password), nil
}

// Partition MIG 分割
func (s *migService) Partition(gpuIDs []int, profile string, password string) ([]ssh.CommandResult, error) {
	if profile == "" {
		profile = "19,19,19,19,19,19,19" // 預設 7 個 1g.10gb
	}

	commands := make([]string, len(gpuIDs))
	for i, gpuID := range gpuIDs {
		commands[i] = fmt.Sprintf("sudo nvidia-smi mig -cgi %s -C -i %d", profile, gpuID)
	}
	return s.sshClient.ExecuteCommands(commands, password), nil
}

// FullSetup 完整 MIG 設定
func (s *migService) FullSetup(gpuIDs []int, password string) ([]ssh.CommandResult, error) {
	// 記錄MIG完整設定開始
	if s.remoteLogger != nil {
		gpuIDsStr := fmt.Sprintf("%v", gpuIDs)
		s.remoteLogger.Info("admin", "MIG Full Setup",
			fmt.Sprintf("Starting MIG full setup for GPUs: %s", gpuIDsStr), "mig")
	}

	commands := make([]string, 0, len(gpuIDs)*2+1)

	// Step 1: 開啟 MIG
	for _, gpuID := range gpuIDs {
		commands = append(commands, fmt.Sprintf("sudo nvidia-smi -i %d -mig 1", gpuID))
	}

	// Step 2: MIG 分割
	for _, gpuID := range gpuIDs {
		commands = append(commands, fmt.Sprintf("sudo nvidia-smi mig -cgi 19,19,19,19,19,19,19 -C -i %d", gpuID))
	}

	// Step 3: 顯示結果
	commands = append(commands, "nvidia-smi")

	results := s.sshClient.ExecuteCommands(commands, password)

	// 記錄執行結果
	if s.remoteLogger != nil {
		successCount := 0
		for _, result := range results {
			if result.Error == "" {
				successCount++
			}
		}

		if successCount == len(commands) {
			gpuIDsStr := fmt.Sprintf("%v", gpuIDs)
			s.remoteLogger.Info("admin", "MIG Full Setup",
				fmt.Sprintf("Successfully completed MIG setup for GPUs: %s", gpuIDsStr), "mig")
		} else {
			s.remoteLogger.Warning("admin", "MIG Full Setup",
				fmt.Sprintf("MIG setup completed with %d/%d successful commands", successCount, len(commands)), "mig")
		}
	}

	return results, nil
}

// Cleanup 清理 MIG 設定
func (s *migService) Cleanup(password string) ([]ssh.CommandResult, error) {
	// 排除監控相關容器: monitoring-grafana-1, monitoring-loki-1, monitoring-promtail-1
	// Docker 不支援 name!= 過濾器，改用 grep -v 排除
	commands := []string{
		"docker ps -a --format '{{.ID}} {{.Names}}' | grep -v 'monitoring-' | awk '{print $1}' | xargs -r docker stop 2>/dev/null || true",
		"docker ps -a --format '{{.ID}} {{.Names}}' | grep -v 'monitoring-' | awk '{print $1}' | xargs -r docker rm 2>/dev/null || true",
	}

	// 對每個 GPU 清理 MIG
	for gpuID := 0; gpuID < 4; gpuID++ {
		commands = append(commands,
			fmt.Sprintf("sudo nvidia-smi mig -i %d -dci 2>/dev/null || true", gpuID),
			fmt.Sprintf("sudo nvidia-smi mig -i %d -dgi 2>/dev/null || true", gpuID),
			fmt.Sprintf("sudo nvidia-smi -i %d -mig 0 2>/dev/null || true", gpuID),
		)
	}

	return s.sshClient.ExecuteCommands(commands, password), nil
}

// DeleteInstance 刪除單一 MIG 實例
func (s *migService) DeleteInstance(gpuID, giID int, password string) ([]ssh.CommandResult, error) {
	commands := []string{
		fmt.Sprintf("sudo nvidia-smi mig -i %d -gi %d -dci", gpuID, giID),
		fmt.Sprintf("sudo nvidia-smi mig -i %d -gi %d -dgi", gpuID, giID),
	}
	return s.sshClient.ExecuteCommands(commands, password), nil
}

// ShutdownGPU 關閉特定 GPU 的所有資源
func (s *migService) ShutdownGPU(gpuID int, password string) (map[string]interface{}, error) {
	results := make(map[string]interface{})
	steps := make([]map[string]interface{}, 0)

	// Step 1: 停止相關容器
	portRangeStart := gpuID*10000 + 1
	portRangeEnd := portRangeStart + 9999

	output, _, _ := s.sshClient.Execute("docker ps --format '{{.ID}}\t{{.Ports}}'")
	containersToStop := make([]string, 0)

	if output != "" {
		re := regexp.MustCompile(`:(\d+)->22`)
		for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
			if line == "" {
				continue
			}
			parts := strings.Split(line, "\t")
			if len(parts) >= 2 {
				containerID := parts[0]
				matches := re.FindAllStringSubmatch(parts[1], -1)
				for _, match := range matches {
					if len(match) >= 2 {
						port, _ := strconv.Atoi(match[1])
						if port >= portRangeStart && port <= portRangeEnd {
							containersToStop = append(containersToStop, containerID)
							break
						}
					}
				}
			}
		}
	}

	if len(containersToStop) > 0 {
		stopCmds := make([]string, len(containersToStop))
		for i, cid := range containersToStop {
			stopCmds[i] = fmt.Sprintf("docker stop %s", cid)
		}
		containerResults := s.sshClient.ExecuteCommands(stopCmds, password)
		steps = append(steps, map[string]interface{}{
			"step":       "停止容器",
			"containers": containersToStop,
			"results":    containerResults,
		})
	} else {
		steps = append(steps, map[string]interface{}{
			"step":    "停止容器",
			"message": fmt.Sprintf("GPU %d 沒有執行中的容器", gpuID),
		})
	}

	// Step 2: 刪除該 GPU 上所有的 CI (不指定 -gi 會刪除全部)
	dciCmd := fmt.Sprintf("sudo nvidia-smi mig -i %d -dci 2>/dev/null || true", gpuID)
	dciResults := s.sshClient.ExecuteCommands([]string{dciCmd}, password)
	steps = append(steps, map[string]interface{}{
		"step":    "刪除所有 CI",
		"command": dciCmd,
		"results": dciResults,
	})

	// Step 3: 刪除該 GPU 上所有的 GI (不指定 -gi 會刪除全部)
	dgiCmd := fmt.Sprintf("sudo nvidia-smi mig -i %d -dgi 2>/dev/null || true", gpuID)
	dgiResults := s.sshClient.ExecuteCommands([]string{dgiCmd}, password)
	steps = append(steps, map[string]interface{}{
		"step":    "刪除所有 GI",
		"command": dgiCmd,
		"results": dgiResults,
	})

	// Step 4: 關閉 MIG
	disableCmd := fmt.Sprintf("sudo nvidia-smi -i %d -mig 0", gpuID)
	disableResults := s.sshClient.ExecuteCommands([]string{disableCmd}, password)
	steps = append(steps, map[string]interface{}{
		"step":    "關閉 MIG 權限",
		"command": disableCmd,
		"results": disableResults,
	})

	// 驗證結果
	verifyOutput, _, _ := s.sshClient.Execute(fmt.Sprintf("nvidia-smi -i %d --query-gpu=mig.mode.current --format=csv,noheader", gpuID))
	migStatus := strings.TrimSpace(verifyOutput)

	steps = append(steps, map[string]interface{}{
		"step":       "驗證結果",
		"mig_status": migStatus,
		"success":    strings.ToLower(migStatus) == "disabled",
	})

	results["gpu_id"] = gpuID
	results["final_mig_status"] = migStatus
	results["results"] = steps

	return results, nil
}
