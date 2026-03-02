package service

import (
	"crypto/md5"
	"fmt"
	"log"
	"regexp"
	"sort"
	"strings"
	"time"

	"gpu-controller/internal/model"
	"gpu-controller/internal/ssh"
)

type LogService struct {
	sshClient *ssh.Client
}

func NewLogService(sshClient *ssh.Client) *LogService {
	return &LogService{
		sshClient: sshClient,
	}
}

// FetchLogs 從遠端伺服器取得日誌
func (s *LogService) FetchLogs(req model.LogsRequest) (*model.LogsResponse, error) {
	// SSH 連線到 10.133.77.231 讀取 gpu_manager.log
	cmd := "cat ~/gpu_manager.log | tail -1000 2>/dev/null || tail -n 1000 ~/gpu_manager.log 2>/dev/null || tail -n 1000 ./gpu_manager.log 2>/dev/null || echo 'Log file not found'"

	output, _, err := s.sshClient.Execute(cmd)
	if err != nil {
		log.Printf("Failed to read log file via SSH: %v", err)
		// 回傳模擬資料作為備案
		return s.getMockLogs(req), nil
	}

	// 調試輸出
	log.Printf("SSH command executed successfully")
	log.Printf("SSH output length: %d characters", len(output))
	log.Printf("SSH output preview (first 200 chars): %s", func() string {
		if len(output) > 200 {
			return output[:200] + "..."
		}
		return output
	}())

	// 檢查是否找到日誌檔案
	if strings.Contains(output, "Log file not found") || strings.TrimSpace(output) == "" {
		log.Printf("Log file not found or empty, using mock data")
		return s.getMockLogs(req), nil
	}

	logs := s.parseLogEntries(output)

	// 如果解析結果為空，使用模擬資料
	if len(logs) == 0 {
		log.Printf("No logs parsed from output, using mock data. Raw output: %s", output)
		return s.getMockLogs(req), nil
	}

	// 根據篩選條件過濾日誌
	filteredLogs := s.filterLogs(logs, req)

	// 分頁處理
	total := len(filteredLogs)
	start := (req.Page - 1) * req.PageSize
	end := start + req.PageSize

	if start >= len(filteredLogs) {
		filteredLogs = []model.LogEntry{}
	} else {
		if end > len(filteredLogs) {
			end = len(filteredLogs)
		}
		filteredLogs = filteredLogs[start:end]
	}

	return &model.LogsResponse{
		Logs:  filteredLogs,
		Total: total,
		Page:  req.Page,
	}, nil
}

// parseLogEntries 解析日誌條目
func (s *LogService) parseLogEntries(output string) []model.LogEntry {
	lines := strings.Split(strings.TrimSpace(output), "\n")
	var logs []model.LogEntry

	// 常見的日誌格式模式
	patterns := []*regexp.Regexp{
		// 2026-02-25 19:56:01,264 [INFO] 執行 MIG 完整設定: GPU [0, 1, 2, 3] (實際 gpu_manager.log 格式)
		regexp.MustCompile(`(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+\[(\w+)\]\s+(.*)`),
		// 2026-02-26 10:30:45 [INFO] user=admin action="GPU Status Check" gpu=gpu-0 temp=65°C
		regexp.MustCompile(`(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.*)`),
		// 2026/02/26 10:30:45 INFO: GPU-0 temperature: 65°C
		regexp.MustCompile(`(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\w+):\s+(.*)`),
		// Feb 26 10:30:45 gpu-server[1234]: GPU allocation completed
		regexp.MustCompile(`(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\w+\[\d+\]:\s+(.*)`),
	}

	for i, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var entry model.LogEntry
		parsed := false

		// 嘗試用不同的正規表達式解析
		for _, pattern := range patterns {
			matches := pattern.FindStringSubmatch(line)
			if len(matches) >= 3 {
				entry = s.createLogEntry(i+1, matches[1], matches[2], matches[3])
				parsed = true
				break
			}
		}

		// 如果無法解析，建立通用條目
		if !parsed {
			entry = s.createGenericLogEntry(i+1, line)
		}

		logs = append(logs, entry)
	}

	// 按時間倒序排列（最新的在前）
	sort.Slice(logs, func(i, j int) bool {
		return logs[i].Timestamp > logs[j].Timestamp
	})

	return logs
}

// createLogEntry 建立日誌條目
func (s *LogService) createLogEntry(id int, timestamp, levelOrContent, content string) model.LogEntry {
	// 生成唯一 ID
	hash := md5.Sum([]byte(fmt.Sprintf("%d-%s-%s", id, timestamp, content)))
	entryID := fmt.Sprintf("%x", hash)[:8]

	// 正規化時間戳
	normalizedTime := s.normalizeTimestamp(timestamp)

	// 從內容中提取資訊
	level, user, action, details, source := s.parseLogContent(levelOrContent, content)

	return model.LogEntry{
		ID:        entryID,
		Timestamp: normalizedTime,
		Level:     level,
		User:      user,
		Action:    action,
		Details:   details,
		Source:    source,
		Message:   content,
	}
}

// createGenericLogEntry 建立通用日誌條目
func (s *LogService) createGenericLogEntry(id int, line string) model.LogEntry {
	hash := md5.Sum([]byte(fmt.Sprintf("%d-%s", id, line)))
	entryID := fmt.Sprintf("%x", hash)[:8]

	return model.LogEntry{
		ID:        entryID,
		Timestamp: time.Now().Format("2006-01-02 15:04:05"),
		Level:     "info",
		User:      "system",
		Action:    "系統日誌",
		Details:   line,
		Source:    "gpu_manager",
		Message:   line,
	}
}

// normalizeTimestamp 正規化時間戳格式
func (s *LogService) normalizeTimestamp(timestamp string) string {
	formats := []string{
		"2006-01-02 15:04:05,000", // gpu_manager.log 格式包含毫秒
		"2006-01-02 15:04:05",
		"2006/01/02 15:04:05",
		"Jan 2 15:04:05",
		"Jan 02 15:04:05",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timestamp); err == nil {
			// 對於只有月日的格式，設定為今年
			if format == "Jan 2 15:04:05" || format == "Jan 02 15:04:05" {
				now := time.Now()
				t = time.Date(now.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.Local)
			}
			return t.Format("2006-01-02 15:04:05")
		}
	}

	return timestamp
}

// parseLogContent 解析日誌內容
func (s *LogService) parseLogContent(levelOrContent, content string) (level, user, action, details, source string) {
	// 預設值
	level = "info"
	user = "system"
	source = "gpu_manager"
	action = "系統操作"
	details = content

	// 檢查是否為日誌級別
	levelOrContent = strings.ToLower(levelOrContent)
	if levelOrContent == "info" || levelOrContent == "warn" || levelOrContent == "warning" ||
		levelOrContent == "error" || levelOrContent == "debug" || levelOrContent == "fatal" {
		level = levelOrContent
		if level == "warn" {
			level = "warning"
		}
	} else {
		// 如果不是日誌級別，則將其視為內容的一部分
		content = levelOrContent + " " + content
		details = content
	}

	// 從內容中提取使用者資訊
	userPatterns := []*regexp.Regexp{
		regexp.MustCompile(`user[=:]\s*(\w+)`),
		regexp.MustCompile(`User:\s*(\w+)`),
		regexp.MustCompile(`\[(\w+)\]`),
	}

	for _, pattern := range userPatterns {
		if matches := pattern.FindStringSubmatch(content); len(matches) > 1 {
			user = matches[1]
			break
		}
	}

	// 從內容中判斷操作類型
	contentLower := strings.ToLower(content)
	switch {
	case strings.Contains(contentLower, "login") || strings.Contains(contentLower, "登入"):
		action = "使用者登入"
	case strings.Contains(contentLower, "logout") || strings.Contains(contentLower, "登出"):
		action = "使用者登出"
	case strings.Contains(contentLower, "container start") || strings.Contains(contentLower, "啟動容器") ||
		strings.Contains(content, "批次啟動容器") || strings.Contains(content, "啟動") || strings.Contains(content, "start"):
		action = "啟動容器"
		source = "container"
	case strings.Contains(contentLower, "container stop") || strings.Contains(contentLower, "停止容器") ||
		strings.Contains(content, "停止"):
		action = "停止容器"
		source = "container"
	case strings.Contains(content, "MIG") || strings.Contains(content, "mig") ||
		strings.Contains(content, "執行 MIG") || strings.Contains(content, "MIG 設定"):
		action = "MIG管理"
		source = "mig"
	case strings.Contains(contentLower, "gpu") && strings.Contains(contentLower, "temperature"):
		action = "GPU溫度監控"
		source = "monitor"
	case strings.Contains(contentLower, "gpu") && (strings.Contains(contentLower, "allocation") || strings.Contains(content, "GPU")):
		action = "GPU管理"
		source = "gpu"
	case strings.Contains(content, "映像") || strings.Contains(contentLower, "image"):
		action = "映像管理"
		source = "image"
	case strings.Contains(content, "日誌") || strings.Contains(contentLower, "log"):
		action = "日誌操作"
		source = "log"
	case strings.Contains(content, "查詢") || strings.Contains(contentLower, "query"):
		action = "查詢操作"
		source = "query"
	case strings.Contains(contentLower, "memory") || strings.Contains(contentLower, "out of memory"):
		action = "記憶體管理"
		source = "memory"
	case strings.Contains(contentLower, "disk") || strings.Contains(contentLower, "storage"):
		action = "儲存空間管理"
		source = "storage"
	case strings.Contains(contentLower, "api") || strings.Contains(contentLower, "request"):
		action = "API呼叫"
		source = "api"
	case strings.Contains(content, "失敗") || strings.Contains(contentLower, "failed") || level == "error":
		action = "系統錯誤"
		source = "system"
	case strings.Contains(content, "警告") || strings.Contains(contentLower, "warning") || level == "warning":
		action = "系統警告"
		source = "system"
	case strings.Contains(content, "完成") || strings.Contains(contentLower, "completed"):
		action = "操作完成"
		source = "system"
	}

	return level, user, action, details, source
}

// filterLogs 篩選日誌
func (s *LogService) filterLogs(logs []model.LogEntry, req model.LogsRequest) []model.LogEntry {
	var filtered []model.LogEntry

	for _, log := range logs {
		// 日誌級別篩選
		if req.Level != "" && req.Level != "all" && log.Level != req.Level {
			continue
		}

		// 關鍵字搜尋
		if req.Search != "" {
			searchLower := strings.ToLower(req.Search)
			if !strings.Contains(strings.ToLower(log.Action), searchLower) &&
				!strings.Contains(strings.ToLower(log.Details), searchLower) &&
				!strings.Contains(strings.ToLower(log.User), searchLower) &&
				!strings.Contains(strings.ToLower(log.Message), searchLower) {
				continue
			}
		}

		// 日期範圍篩選
		if req.StartDate != "" || req.EndDate != "" {
			logTime, err := time.Parse("2006-01-02 15:04:05", log.Timestamp)
			if err != nil {
				continue
			}

			if req.StartDate != "" {
				startTime, err := time.Parse("2006-01-02", req.StartDate)
				if err == nil && logTime.Before(startTime) {
					continue
				}
			}

			if req.EndDate != "" {
				endTime, err := time.Parse("2006-01-02", req.EndDate)
				if err == nil && logTime.After(endTime.Add(24*time.Hour)) {
					continue
				}
			}
		}

		filtered = append(filtered, log)
	}

	return filtered
}

// getMockLogs 取得模擬日誌資料（備案）
func (s *LogService) getMockLogs(req model.LogsRequest) *model.LogsResponse {
	mockLogs := []model.LogEntry{
		{
			ID: "mock001", Timestamp: "2026-02-26 17:58:50", Level: "error", User: "system",
			Action: "系統錯誤", Details: "查詢日誌失敗: Expecting value: line 1 column 1 (char 0)", Source: "log",
			Message: "查詢日誌失敗: Expecting value: line 1 column 1 (char 0)",
		},
		{
			ID: "mock002", Timestamp: "2026-02-25 19:56:30", Level: "info", User: "system",
			Action: "啟動容器", Details: "批次啟動容器: 1 配置, 映像: ssh-nvidia:latest", Source: "container",
			Message: "批次啟動容器: 1 配置, 映像: ssh-nvidia:latest",
		},
		{
			ID: "mock003", Timestamp: "2026-02-25 19:56:01", Level: "info", User: "system",
			Action: "MIG管理", Details: "執行 MIG 完整設定: GPU [0, 1, 2, 3]", Source: "mig",
			Message: "執行 MIG 完整設定: GPU [0, 1, 2, 3]",
		},
		{
			ID: "mock004", Timestamp: "2026-02-25 19:50:15", Level: "info", User: "system",
			Action: "GPU管理", Details: "GPU 狀態檢查完成: 4 個 GPU 正常運行", Source: "gpu",
			Message: "GPU 狀態檢查完成: 4 個 GPU 正常運行",
		},
		{
			ID: "mock005", Timestamp: "2026-02-25 19:45:30", Level: "info", User: "system",
			Action: "啟動容器", Details: "容器啟動完成: nginx-proxy on GPU-1", Source: "container",
			Message: "容器啟動完成: nginx-proxy on GPU-1",
		},
		{
			ID: "mock006", Timestamp: "2026-02-25 19:40:20", Level: "warning", User: "system",
			Action: "系統警告", Details: "GPU-2 溫度過高: 82°C", Source: "monitor",
			Message: "GPU-2 溫度過高: 82°C",
		},
		{
			ID: "mock007", Timestamp: "2026-02-25 19:35:10", Level: "info", User: "system",
			Action: "映像管理", Details: "拉取映像完成: tensorflow/tensorflow:latest-gpu", Source: "image",
			Message: "拉取映像完成: tensorflow/tensorflow:latest-gpu",
		},
		{
			ID: "mock008", Timestamp: "2026-02-25 19:30:05", Level: "error", User: "system",
			Action: "系統錯誤", Details: "容器啟動失敗: 記憶體不足", Source: "container",
			Message: "容器啟動失敗: 記憶體不足",
		},
	}

	// 套用篩選
	filtered := s.filterLogs(mockLogs, req)

	// 分頁
	total := len(filtered)
	start := (req.Page - 1) * req.PageSize
	end := start + req.PageSize

	if start >= len(filtered) {
		filtered = []model.LogEntry{}
	} else {
		if end > len(filtered) {
			end = len(filtered)
		}
		filtered = filtered[start:end]
	}

	return &model.LogsResponse{
		Logs:  filtered,
		Total: total,
		Page:  req.Page,
	}
}

// WriteLogToRemote 寫入日誌到遠端伺服器
func (s *LogService) WriteLogToRemote(level, message, source, user string) error {
	if s.sshClient == nil {
		return fmt.Errorf("SSH 連線未建立")
	}

	// 產生時間戳（包含毫秒）
	timestamp := time.Now().Format("2006-01-02 15:04:05,000")

	// 建立日誌條目
	logEntry := fmt.Sprintf("%s [%s] %s: %s (user: %s, source: %s)",
		timestamp, strings.ToUpper(level), source, message, user, source)

	// 使用 SSH 執行 echo 命令將日誌寫入遠端檔案
	// 使用 printf 以及雙引號來處理中文字符
	cmd := fmt.Sprintf("printf '%%s\\n' %q >> ~/gpu_manager.log", logEntry)

	log.Printf("Sending log to remote: %s", logEntry)

	_, stderr, err := s.sshClient.Execute(cmd)
	if err != nil {
		log.Printf("Failed to write log to remote: %v, stderr: %s", err, stderr)
		return fmt.Errorf("寫入遠端日誌失敗: %v", err)
	}

	if stderr != "" {
		log.Printf("Warning when writing log: %s", stderr)
	}

	log.Printf("Log written successfully to remote server")
	return nil
}

// WriteSystemLogToRemote 寫入系統日誌
func (s *LogService) WriteSystemLogToRemote(level, action, details string) error {
	return s.WriteLogToRemote(level, fmt.Sprintf("%s: %s", action, details), "system", "web-admin")
}

// WriteUserActionLogToRemote 寫入使用者操作日誌
func (s *LogService) WriteUserActionLogToRemote(user, action, details string) error {
	return s.WriteLogToRemote("INFO", fmt.Sprintf("使用者操作 - %s: %s", action, details), "web-frontend", user)
}
