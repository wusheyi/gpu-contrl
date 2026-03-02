package service

import (
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"gpu-controller/internal/config"
	"gpu-controller/internal/ssh"
)

// LogLevel 日誌級別
type LogLevel string

const (
	LogLevelInfo    LogLevel = "INFO"
	LogLevelWarning LogLevel = "WARNING"
	LogLevelError   LogLevel = "ERROR"
	LogLevelDebug   LogLevel = "DEBUG"
)

// RemoteLogger 遠端日誌服務
type RemoteLogger struct {
	sshClient ssh.Executor
	config    config.LogConfig
	mu        sync.RWMutex
}

// NewRemoteLogger 建立新的遠端日誌服務
func NewRemoteLogger(sshClient ssh.Executor, cfg *config.Config) *RemoteLogger {
	return &RemoteLogger{
		sshClient: sshClient,
		config:    cfg.GetLogConfig(),
	}
}

// LogEntry 日誌條目結構
type LogEntry struct {
	Timestamp string
	Level     LogLevel
	User      string
	Action    string
	Details   string
	Source    string
}

// Log 記錄日誌到遠端檔案
func (r *RemoteLogger) Log(level LogLevel, user, action, details, source string) error {
	if !r.config.Enabled {
		return nil // 日誌功能關閉
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	// 檢查 SSH 連線狀態
	if !r.sshClient.IsConnected() {
		if r.config.DebugMode {
			log.Printf("[RemoteLogger] SSH not connected, skipping log")
		}
		return fmt.Errorf("SSH 連線尚未建立")
	}

	entry := LogEntry{
		Timestamp: time.Now().Format("2006-01-02 15:04:05,000"),
		Level:     level,
		User:      user,
		Action:    action,
		Details:   details,
		Source:    source,
	}

	logLine := r.formatLogEntry(entry)

	// 轉義特殊字符以防止命令注入
	escapedLog := strings.ReplaceAll(logLine, "\"", "\\\"")
	escapedLog = strings.ReplaceAll(escapedLog, "`", "\\`")
	escapedLog = strings.ReplaceAll(escapedLog, "$", "\\$")

	// 寫入主要日誌檔案
	cmd := fmt.Sprintf("echo \"%s\" >> %s", escapedLog, r.config.RemotePath)
	_, stderr, err := r.sshClient.Execute(cmd)

	if err != nil || stderr != "" {
		// 如果主要路徑失敗，嘗試備份路徑
		backupCmd := fmt.Sprintf("echo \"%s\" >> %s", escapedLog, r.config.BackupPath)
		_, backupStderr, backupErr := r.sshClient.Execute(backupCmd)

		if backupErr != nil || backupStderr != "" {
			if r.config.DebugMode {
				log.Printf("[RemoteLogger] Failed to write to both paths: main=%v, backup=%v", err, backupErr)
			}
			return fmt.Errorf("無法寫入遠端日誌檔案")
		}
	}

	if r.config.DebugMode {
		log.Printf("[RemoteLogger] Logged: %s", logLine)
	}

	return nil
}

// formatLogEntry 格式化日誌條目
func (r *RemoteLogger) formatLogEntry(entry LogEntry) string {
	if entry.User != "" && entry.Action != "" {
		return fmt.Sprintf("%s [%s] user=%s action=\"%s\" details=\"%s\" source=%s",
			entry.Timestamp, entry.Level, entry.User, entry.Action, entry.Details, entry.Source)
	}
	return fmt.Sprintf("%s [%s] %s", entry.Timestamp, entry.Level, entry.Details)
}

// Info 記錄資訊日誌
func (r *RemoteLogger) Info(user, action, details, source string) error {
	return r.Log(LogLevelInfo, user, action, details, source)
}

// Warning 記錄警告日誌
func (r *RemoteLogger) Warning(user, action, details, source string) error {
	return r.Log(LogLevelWarning, user, action, details, source)
}

// Error 記錄錯誤日誌
func (r *RemoteLogger) Error(user, action, details, source string) error {
	return r.Log(LogLevelError, user, action, details, source)
}

// Debug 記錄調試日誌
func (r *RemoteLogger) Debug(user, action, details, source string) error {
	if !r.config.DebugMode {
		return nil // 僅在調試模式下記錄
	}
	return r.Log(LogLevelDebug, user, action, details, source)
}

// InfoSimple 記錄簡單資訊日誌（僅消息）
func (r *RemoteLogger) InfoSimple(message string) error {
	return r.Log(LogLevelInfo, "", "", message, "system")
}

// ErrorSimple 記錄簡單錯誤日誌（僅消息）
func (r *RemoteLogger) ErrorSimple(message string) error {
	return r.Log(LogLevelError, "", "", message, "system")
}

// TestConnection 測試日誌連線
func (r *RemoteLogger) TestConnection() error {
	return r.InfoSimple("Remote logger test connection")
}
