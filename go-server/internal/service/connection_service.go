package service

import (
	"gpu-controller/internal/config"
	"gpu-controller/internal/ssh"
)

// ConnectionService 連線服務介面
type ConnectionService interface {
	Connect(hostname, username, password string) error
	ConnectWithDefaults() error
	Disconnect()
	IsConnected() bool
	GetHostname() string
	EnsureConnection() error
	GetPassword() string
}

// connectionService 連線服務實作
type connectionService struct {
	sshClient ssh.Executor
	config    *config.Config
}

// NewConnectionService 建立連線服務
func NewConnectionService(sshClient ssh.Executor, config *config.Config) ConnectionService {
	return &connectionService{
		sshClient: sshClient,
		config:    config,
	}
}

// Connect 建立 SSH 連線
func (s *connectionService) Connect(hostname, username, password string) error {
	return s.sshClient.Connect(hostname, username, password, 22)
}

// ConnectWithDefaults 使用預設配置連線
func (s *connectionService) ConnectWithDefaults() error {
	cfg := s.config.GetSSHConfig()
	return s.sshClient.Connect(cfg.Hostname, cfg.Username, cfg.Password, cfg.Port)
}

// Disconnect 斷開連線
func (s *connectionService) Disconnect() {
	s.sshClient.Disconnect()
}

// IsConnected 檢查連線狀態
func (s *connectionService) IsConnected() bool {
	return s.sshClient.IsConnected()
}

// GetHostname 取得主機名
func (s *connectionService) GetHostname() string {
	return s.sshClient.GetHostname()
}

// EnsureConnection 確保已連線
func (s *connectionService) EnsureConnection() error {
	if !s.sshClient.IsConnected() {
		return s.ConnectWithDefaults()
	}
	return nil
}

// GetPassword 取得 SSH 密碼
func (s *connectionService) GetPassword() string {
	return s.config.GetSSHConfig().Password
}
