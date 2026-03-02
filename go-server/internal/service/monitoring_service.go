package service

import (
	"fmt"
	"log"
	"strings"

	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

type MonitoringService struct {
	sshClient *ssh.Client
}

func NewMonitoringService(sshClient *ssh.Client) *MonitoringService {
	return &MonitoringService{
		sshClient: sshClient,
	}
}

// GetMonitoringStatus 取得監控服務狀態
func (s *MonitoringService) GetMonitoringStatus() (*model.MonitoringStatus, error) {
	// 檢查 Docker 容器狀態 - 修正格式，移除不存在的 State 欄位
	cmd := "docker ps -a --format 'table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}' | grep -E '(monitoring_grafana_1|monitoring_loki_1|monitoring_promtail_1)'"

	output, _, err := s.sshClient.Execute(cmd)
	if err != nil {
		log.Printf("Failed to check docker containers: %v", err)
		return s.getDefaultStatus(), nil
	}

	log.Printf("Docker output: %s", output)

	status := &model.MonitoringStatus{
		Grafana:  model.DockerContainer{Name: "monitoring_grafana_1", Image: "grafana/grafana:latest", Status: "未找到", State: "stopped"},
		Loki:     model.DockerContainer{Name: "monitoring_loki_1", Image: "grafana/loki:2.9.1", Status: "未找到", State: "stopped"},
		Promtail: model.DockerContainer{Name: "monitoring_promtail_1", Image: "grafana/promtail:2.9.1", Status: "未找到", State: "stopped"},
	}

	// 解析輸出
	lines := strings.Split(strings.TrimSpace(output), "\n")
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		container := s.parseContainerLine(line)
		if container.Name == "" {
			continue
		}

		switch container.Name {
		case "monitoring_grafana_1":
			status.Grafana = container
		case "monitoring_loki_1":
			status.Loki = container
		case "monitoring_promtail_1":
			status.Promtail = container
		}
	}

	// 檢查是否全部運行
	status.AllRunning = (status.Grafana.State == "running" &&
		status.Loki.State == "running" &&
		status.Promtail.State == "running")

	return status, nil
}

// parseContainerLine 解析 Docker 容器行
func (s *MonitoringService) parseContainerLine(line string) model.DockerContainer {
	// Docker ps 輸出格式: Names Image Status Ports
	fields := strings.Fields(line)
	if len(fields) < 3 {
		return model.DockerContainer{}
	}

	container := model.DockerContainer{
		Name:  fields[0],
		Image: fields[1],
	}

	// Status 可能包含多個字詞，重新組合
	if len(fields) >= 4 {
		// 找到 Ports 欄位（包含端口映射的部分）
		statusEnd := len(fields)
		for i, field := range fields {
			if i >= 2 && (strings.Contains(field, ":") || strings.Contains(field, "->")) {
				statusEnd = i
				break
			}
		}

		container.Status = strings.Join(fields[2:statusEnd], " ")

		// 如果有端口資訊
		if statusEnd < len(fields) {
			container.Ports = strings.Join(fields[statusEnd:], " ")
		}
	} else {
		container.Status = strings.Join(fields[2:], " ")
	}

	// 檢查容器狀態
	statusLower := strings.ToLower(container.Status)
	if strings.Contains(statusLower, "up") {
		container.State = "running"
	} else if strings.Contains(statusLower, "exited") {
		container.State = "stopped"
	} else {
		container.State = "unknown"
	}

	return container
}

// StartMonitoringServices 啟動監控服務
func (s *MonitoringService) StartMonitoringServices(req model.MonitoringStartRequest) error {
	// 檢查是否需要啟動所有服務
	if len(req.Services) == 0 || (len(req.Services) == 1 && req.Services[0] == "all") {
		req.Services = []string{"grafana", "loki", "promtail"}
	}

	var errors []string

	for _, service := range req.Services {
		containerName := ""
		switch service {
		case "grafana":
			containerName = "monitoring_grafana_1"
		case "loki":
			containerName = "monitoring_loki_1"
		case "promtail":
			containerName = "monitoring_promtail_1"
		default:
			errors = append(errors, fmt.Sprintf("未知服務: %s", service))
			continue
		}

		// 嘗試啟動容器
		cmd := fmt.Sprintf("docker start %s", containerName)
		output, _, err := s.sshClient.Execute(cmd)

		if err != nil {
			log.Printf("Failed to start container %s: %v", containerName, err)
			errors = append(errors, fmt.Sprintf("啟動 %s 失敗: %v", containerName, err))
		} else if strings.Contains(strings.ToLower(output), "error") {
			errors = append(errors, fmt.Sprintf("啟動 %s 失敗: %s", containerName, output))
		} else {
			log.Printf("Successfully started container %s", containerName)
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("部分服務啟動失敗: %s", strings.Join(errors, "; "))
	}

	return nil
}

// StartMonitoringStack 啟動完整的監控堆疊（使用 docker-compose）
func (s *MonitoringService) StartMonitoringStack() error {
	// 嘗試使用 docker-compose 啟動
	cmd := "cd ~/monitoring && docker-compose up -d"
	output, stderr, err := s.sshClient.Execute(cmd)

	if err != nil {
		log.Printf("Failed to start monitoring stack: %v, stderr: %s", err, stderr)
		return fmt.Errorf("啟動監控堆疊失敗: %v", err)
	}

	if strings.Contains(strings.ToLower(output), "error") || strings.Contains(strings.ToLower(stderr), "error") {
		return fmt.Errorf("啟動監控堆疊失敗: %s", output+stderr)
	}

	log.Printf("Monitoring stack started successfully")
	return nil
}

// getDefaultStatus 取得預設狀態（當無法檢查時）
func (s *MonitoringService) getDefaultStatus() *model.MonitoringStatus {
	return &model.MonitoringStatus{
		Grafana: model.DockerContainer{
			Name:   "monitoring_grafana_1",
			Image:  "grafana/grafana:latest",
			Status: "無法檢查",
			State:  "unknown",
		},
		Loki: model.DockerContainer{
			Name:   "monitoring_loki_1",
			Image:  "grafana/loki:2.9.1",
			Status: "無法檢查",
			State:  "unknown",
		},
		Promtail: model.DockerContainer{
			Name:   "monitoring_promtail_1",
			Image:  "grafana/promtail:2.9.1",
			Status: "無法檢查",
			State:  "unknown",
		},
		AllRunning: false,
	}
}
