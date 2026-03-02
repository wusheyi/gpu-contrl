package service

import (
	"fmt"
	"strconv"
	"strings"

	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

// GPUService GPU 監控服務介面
type GPUService interface {
	GetStatus() (string, error)
	GetMetrics() (*model.GPUMetricsResponse, error)
	GetRunningContainerCount() int
}

// gpuService GPU 服務實作
type gpuService struct {
	sshClient    ssh.Executor
	remoteLogger *RemoteLogger
}

// NewGPUService 建立 GPU 服務
func NewGPUService(sshClient ssh.Executor, remoteLogger *RemoteLogger) GPUService {
	return &gpuService{
		sshClient:    sshClient,
		remoteLogger: remoteLogger,
	}
}

// GetStatus 取得 GPU 狀態
func (s *gpuService) GetStatus() (string, error) {
	// 記錄操作日誌
	if s.remoteLogger != nil {
		s.remoteLogger.Info("system", "GPU Status Check", "Executing nvidia-smi command", "gpu")
	}

	output, _, err := s.sshClient.Execute("nvidia-smi")
	if err != nil {
		if s.remoteLogger != nil {
			s.remoteLogger.Error("system", "GPU Status Check", fmt.Sprintf("nvidia-smi command failed: %v", err), "gpu")
		}
		return "", err
	}

	if s.remoteLogger != nil {
		s.remoteLogger.Info("system", "GPU Status Check", "nvidia-smi command completed successfully", "gpu")
	}

	return output, nil
}

// GetMetrics 取得 GPU 詳細指標
func (s *gpuService) GetMetrics() (*model.GPUMetricsResponse, error) {
	// 記錄操作日誌
	if s.remoteLogger != nil {
		s.remoteLogger.Info("system", "GPU Metrics Query", "Fetching detailed GPU metrics", "monitor")
	}

	query := "nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu,temperature.gpu,power.draw,power.limit --format=csv,noheader,nounits"
	output, _, err := s.sshClient.Execute(query)
	if err != nil {
		if s.remoteLogger != nil {
			s.remoteLogger.Error("system", "GPU Metrics Query", fmt.Sprintf("nvidia-smi metrics query failed: %v", err), "monitor")
		}
		return nil, err
	}

	gpus := make([]model.GPUInfo, 0)
	lines := strings.Split(strings.TrimSpace(output), "\n")

	for _, line := range lines {
		if line == "" {
			continue
		}

		parts := strings.Split(line, ",")
		if len(parts) < 8 {
			continue
		}

		// 解析各欄位
		index, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
		name := strings.TrimSpace(parts[1])
		memUsed := parseFloat(parts[2], 0)
		memTotal := parseFloat(parts[3], 81920)
		utilization := parseFloat(parts[4], 0)
		temperature := parseFloat(parts[5], 0)
		powerDraw := parseFloat(parts[6], 0)
		powerLimit := parseFloat(parts[7], 400)

		gpus = append(gpus, model.GPUInfo{
			Index: index,
			Name:  name,
			Memory: model.MemoryInfo{
				Used:  memUsed,
				Total: memTotal,
				Unit:  "MB",
			},
			Utilization: utilization,
			Temperature: temperature,
			Power: model.PowerInfo{
				Draw:  powerDraw,
				Limit: powerLimit,
				Unit:  "W",
			},
		})
	}

	// 計算摘要
	var totalMemUsed, totalMem, totalPower float64
	activeGPUs := 0

	for _, gpu := range gpus {
		totalMemUsed += gpu.Memory.Used
		totalMem += gpu.Memory.Total
		totalPower += gpu.Power.Draw
		if gpu.Utilization > 0 {
			activeGPUs++
		}
	}

	memUsagePercent := 0.0
	if totalMem > 0 {
		memUsagePercent = (totalMemUsed / totalMem) * 100
	}

	runningContainers := s.GetRunningContainerCount()
	// 記錄成功日誌
	if s.remoteLogger != nil {
		summaryMsg := fmt.Sprintf("Total GPUs: %d, Active: %d, Memory Usage: %.1f%%, Power: %.1fW, Containers: %d",
			len(gpus), activeGPUs, memUsagePercent, totalPower, runningContainers)
		s.remoteLogger.Info("system", "GPU Metrics Query", summaryMsg, "monitor")
	}
	return &model.GPUMetricsResponse{
		GPUs: gpus,
		Summary: model.GPUMetricsSummary{
			TotalGPUs:          len(gpus),
			ActiveGPUs:         activeGPUs,
			TotalMemoryUsed:    totalMemUsed,
			TotalMemory:        totalMem,
			MemoryUsagePercent: memUsagePercent,
			TotalPower:         totalPower,
			RunningContainers:  runningContainers,
		},
	}, nil
}

// GetRunningContainerCount 取得運行中容器數量
func (s *gpuService) GetRunningContainerCount() int {
	output, _, _ := s.sshClient.Execute("docker ps -q | wc -l")
	count, _ := strconv.Atoi(strings.TrimSpace(output))
	return count
}

// parseFloat 解析浮點數
func parseFloat(s string, defaultVal float64) float64 {
	s = strings.TrimSpace(s)
	if s == "" || s == "[N/A]" {
		return defaultVal
	}
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return defaultVal
	}
	return val
}
