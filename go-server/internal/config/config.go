package config

import (
	"os"
	"strconv"
)

// Config 應用程式配置
type Config struct {
	SSH SSHConfig
	Log LogConfig
}

// SSHConfig SSH 連線配置
type SSHConfig struct {
	Hostname string
	Username string
	Password string
	Port     int
}

// LogConfig 日誌配置
type LogConfig struct {
	RemotePath string // 遠端日誌檔案路徑
	BackupPath string // 備份日誌檔案路徑
	Enabled    bool   // 是否啟用遠端日誌
	DebugMode  bool   // 調試模式
}

// New 建立新的配置實例
func New() *Config {
	port := 22
	if p := os.Getenv("SSH_PORT"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			port = parsed
		}
	}

	// 日誌配置
	logEnabled := true
	if e := os.Getenv("LOG_ENABLED"); e == "false" {
		logEnabled = false
	}

	debugMode := os.Getenv("DEBUG") == "true"

	return &Config{
		SSH: SSHConfig{
			Hostname: os.Getenv("hostname"),
			Username: os.Getenv("user"),
			Password: os.Getenv("passwd"),
			Port:     port,
		},
		Log: LogConfig{
			RemotePath: getEnvOrDefault("LOG_PATH", "/home/ai/gpu_manager.log"),
			BackupPath: getEnvOrDefault("LOG_BACKUP_PATH", "/tmp/gpu_manager.log"),
			Enabled:    logEnabled,
			DebugMode:  debugMode,
		},
	}
}

// GetSSHConfig 取得 SSH 配置
func (c *Config) GetSSHConfig() SSHConfig {
	return c.SSH
}

// GetLogConfig 取得日誌配置
func (c *Config) GetLogConfig() LogConfig {
	return c.Log
}

// getEnvOrDefault 取得環境變數或預設值
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
