package model

// Response 通用 API 回應
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// GPUInfo GPU 資訊
type GPUInfo struct {
	Index       int        `json:"index"`
	Name        string     `json:"name"`
	Memory      MemoryInfo `json:"memory"`
	Utilization float64    `json:"utilization"`
	Temperature float64    `json:"temperature"`
	Power       PowerInfo  `json:"power"`
}

// MemoryInfo 記憶體資訊
type MemoryInfo struct {
	Used  float64 `json:"used"`
	Total float64 `json:"total"`
	Unit  string  `json:"unit"`
}

// PowerInfo 功耗資訊
type PowerInfo struct {
	Draw  float64 `json:"draw"`
	Limit float64 `json:"limit"`
	Unit  string  `json:"unit"`
}

// GPUMetricsResponse GPU 指標回應
type GPUMetricsResponse struct {
	GPUs    []GPUInfo         `json:"gpus"`
	Summary GPUMetricsSummary `json:"summary"`
}

// GPUMetricsSummary GPU 指標摘要
type GPUMetricsSummary struct {
	TotalGPUs          int     `json:"total_gpus"`
	ActiveGPUs         int     `json:"active_gpus"`
	TotalMemoryUsed    float64 `json:"total_memory_used"`
	TotalMemory        float64 `json:"total_memory"`
	MemoryUsagePercent float64 `json:"memory_usage_percent"`
	TotalPower         float64 `json:"total_power"`
	RunningContainers  int     `json:"running_containers"`
}

// MIGInstance MIG 實例資訊
type MIGInstance struct {
	GIID      int    `json:"gi_id"`
	Name      string `json:"name"`
	Placement string `json:"placement"`
}

// MIGInfo MIG 資訊
type MIGInfo struct {
	Instances  []MIGInstance `json:"instances"`
	Total      int           `json:"total"`
	Used       int           `json:"used"`
	MIGEnabled bool          `json:"mig_enabled"`
}

// MIGStatusResponse MIG 狀態回應
type MIGStatusResponse struct {
	RawOutput string           `json:"raw_output"`
	MIGInfo   map[int]*MIGInfo `json:"mig_info"`
	MIGModes  map[int]bool     `json:"mig_modes"`
}

// Container 容器資訊
type Container struct {
	ID     string `json:"id"`
	Image  string `json:"image"`
	Ports  string `json:"ports"`
	Status string `json:"status"`
}

// ContainerStartRequest 啟動容器請求
type ContainerStartRequest struct {
	DeviceID int    `json:"device_id"`
	Nums     int    `json:"nums"`
	Image    string `json:"image"`
}

// ContainerStartBatchRequest 批次啟動容器請求
type ContainerStartBatchRequest struct {
	GPUConfigs []GPUConfig `json:"gpu_configs"`
	Image      string      `json:"image"`
}

// GPUConfig GPU 配置
type GPUConfig struct {
	DeviceID int `json:"device_id"`
	Nums     int `json:"nums"`
}

// DockerImage Docker 映像檔資訊
type DockerImage struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Tag      string `json:"tag"`
	Size     string `json:"size"`
	Created  string `json:"created"`
	Registry string `json:"registry"`
	FullName string `json:"fullName"`
}

// ImageInspectInfo 映像檔詳細資訊
type ImageInspectInfo struct {
	ID           string          `json:"id"`
	Created      string          `json:"created"`
	Size         int64           `json:"size"`
	Architecture string          `json:"architecture"`
	OS           string          `json:"os"`
	Author       string          `json:"author"`
	Config       ImageConfigInfo `json:"config"`
	Layers       int             `json:"layers"`
}

// ImageConfigInfo 映像檔配置資訊
type ImageConfigInfo struct {
	Env        []string          `json:"env"`
	Cmd        []string          `json:"cmd"`
	Entrypoint []string          `json:"entrypoint"`
	Labels     map[string]string `json:"labels"`
}

// LogEntry 日誌條目
type LogEntry struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"`
	User      string `json:"user"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	Source    string `json:"source"`
	Message   string `json:"message"`
}

// LogsRequest 日誌查詢請求
type LogsRequest struct {
	Level     string `json:"level"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
	Search    string `json:"search"`
	Page      int    `json:"page"`
	PageSize  int    `json:"pageSize"`
}

// LogsResponse 日誌回應
type LogsResponse struct {
	Logs  []LogEntry `json:"logs"`
	Total int        `json:"total"`
	Page  int        `json:"page"`
}

// SendLogRequest 傳送日誌請求
type SendLogRequest struct {
	Level   string `json:"level" binding:"required"`   // INFO, ERROR, WARNING
	Message string `json:"message" binding:"required"` // 日誌內容
	Source  string `json:"source"`                     // 日誌來源 (選填)
	User    string `json:"user"`                       // 使用者 (選填)
	Action  string `json:"action"`                     // 操作類型 (選填)
}

// UserActionLogRequest 使用者操作日誌請求
type UserActionLogRequest struct {
	User    string `json:"user" binding:"required"`    // 使用者名稱
	Action  string `json:"action" binding:"required"`  // 操作類型
	Details string `json:"details" binding:"required"` // 操作詳情
}

// DockerContainer Docker容器資訊
type DockerContainer struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Image  string `json:"image"`
	Status string `json:"status"`
	Ports  string `json:"ports"`
	State  string `json:"state"` // running, stopped, etc.
}

// MonitoringStatus 監控服務狀態
type MonitoringStatus struct {
	Grafana    DockerContainer `json:"grafana"`
	Loki       DockerContainer `json:"loki"`
	Promtail   DockerContainer `json:"promtail"`
	AllRunning bool            `json:"all_running"`
}

// MonitoringStartRequest 監控服務啟動請求
type MonitoringStartRequest struct {
	Services []string `json:"services"` // grafana, loki, promtail 或 all
}
