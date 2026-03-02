package ssh

import (
	"fmt"
	"strings"
	"sync"

	"golang.org/x/crypto/ssh"
)

// Executor 定義 SSH 執行介面 (降低耦合)
type Executor interface {
	Connect(hostname, username, password string, port int) error
	Disconnect()
	IsConnected() bool
	GetHostname() string
	Execute(command string) (string, string, error)
	ExecuteWithSudo(command string, password string) (string, string, error)
	ExecuteCommands(commands []string, sudoPassword string) []CommandResult
}

// CommandResult 指令執行結果
type CommandResult struct {
	Command string `json:"command"`
	Output  string `json:"output"`
	Error   string `json:"error"`
}

// Client SSH 客戶端實作
type Client struct {
	client   *ssh.Client
	hostname string
	mu       sync.RWMutex
}

// NewClient 建立新的 SSH 客戶端
func NewClient() *Client {
	return &Client{}
}

// Connect 建立 SSH 連線
func (c *Client) Connect(hostname, username, password string, port int) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
	}

	addr := fmt.Sprintf("%s:%d", hostname, port)
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return fmt.Errorf("SSH 連線失敗: %w", err)
	}

	c.client = client
	c.hostname = hostname
	return nil
}

// Disconnect 斷開 SSH 連線
func (c *Client) Disconnect() {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.client != nil {
		c.client.Close()
		c.client = nil
		c.hostname = ""
	}
}

// IsConnected 檢查是否已連線
func (c *Client) IsConnected() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.client != nil
}

// GetHostname 取得已連線的主機名
func (c *Client) GetHostname() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.hostname
}

// Execute 執行 SSH 指令
func (c *Client) Execute(command string) (string, string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.client == nil {
		return "", "", fmt.Errorf("尚未建立 SSH 連線")
	}

	session, err := c.client.NewSession()
	if err != nil {
		return "", "", fmt.Errorf("建立 session 失敗: %w", err)
	}
	defer session.Close()

	var stdout, stderr strings.Builder
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)

	return stdout.String(), stderr.String(), err
}

// ExecuteWithSudo 執行需要 sudo 的指令
func (c *Client) ExecuteWithSudo(command string, password string) (string, string, error) {
	// 使用 echo password | sudo -S 方式執行
	sudoCommand := fmt.Sprintf("echo '%s' | sudo -S %s", password, command)
	output, errOutput, err := c.Execute(sudoCommand)

	// 過濾密碼相關訊息
	lines := strings.Split(errOutput, "\n")
	filteredLines := make([]string, 0)
	for _, line := range lines {
		if !strings.Contains(strings.ToLower(line), "password") {
			filteredLines = append(filteredLines, line)
		}
	}

	return output, strings.Join(filteredLines, "\n"), err
}

// ExecuteCommands 執行多個指令
func (c *Client) ExecuteCommands(commands []string, sudoPassword string) []CommandResult {
	results := make([]CommandResult, 0, len(commands))

	for _, cmd := range commands {
		var output, errOutput string
		var err error

		if strings.HasPrefix(strings.TrimSpace(cmd), "sudo") {
			// 移除 sudo 前綴
			cmdWithoutSudo := strings.TrimPrefix(strings.TrimSpace(cmd), "sudo")
			cmdWithoutSudo = strings.TrimSpace(cmdWithoutSudo)
			output, errOutput, err = c.ExecuteWithSudo(cmdWithoutSudo, sudoPassword)
		} else {
			output, errOutput, err = c.Execute(cmd)
		}

		result := CommandResult{
			Command: cmd,
			Output:  output,
			Error:   errOutput,
		}
		if err != nil && errOutput == "" {
			result.Error = err.Error()
		}

		results = append(results, result)
	}

	return results
}
