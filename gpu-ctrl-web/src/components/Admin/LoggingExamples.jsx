import React, { useState } from 'react';
import { 
  sendLogToRemote, 
  sendUserActionLog, 
  logSystemAction, 
  logUserAction 
} from '../../services/adminApi';

// 使用範例：如何在其他組件中記錄日誌
const LoggingExamples = () => {
  const [message, setMessage] = useState('');
  
  // 範例 1: 記錄使用者登入
  const handleUserLogin = async (username) => {
    try {
      // 執行登入邏輯...
      
      // 記錄使用者操作
      await logUserAction(username, '使用者登入', `IP: ${window.location.hostname}, 時間: ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // 範例 2: 記錄容器操作
  const handleContainerStart = async (containerName, gpuId, username) => {
    try {
      // 執行啟動容器邏輯...
      
      // 記錄系統操作
      await logSystemAction('啟動容器', `容器: ${containerName}, GPU: ${gpuId}, 操作者: ${username}`);
      
      // 也可以記錄使用者操作
      await logUserAction(username, '啟動容器', `容器名稱: ${containerName}, GPU ID: ${gpuId}`);
    } catch (error) {
      console.error('Container start failed:', error);
      
      // 記錄錯誤日誌
      await sendLogToRemote('ERROR', `容器啟動失敗: ${containerName} - ${error.message}`, 'container-manager', username);
    }
  };

  // 範例 3: 記錄 MIG 操作
  const handleMIGOperation = async (operation, gpuIds, username) => {
    try {
      // 執行 MIG 操作...
      
      await logSystemAction('MIG管理', `操作: ${operation}, GPU: [${gpuIds.join(', ')}], 操作者: ${username}`);
    } catch (error) {
      await sendLogToRemote('ERROR', `MIG操作失敗: ${operation} - ${error.message}`, 'mig-manager', username);
    }
  };

  // 範例 4: 記錄監控服務操作  
  const handleMonitoringAction = async (action, services, username = 'admin') => {
    try {
      // 執行監控操作...
      
      await logSystemAction('監控管理', `${action}: [${services.join(', ')}]`);
    } catch (error) {
      await sendLogToRemote('ERROR', `監控操作失敗: ${action} - ${error.message}`, 'monitoring', username);
    }
  };

  // 範例 5: 記錄系統警告
  const handleSystemWarning = async (warningType, details) => {
    await sendLogToRemote('WARNING', `系統警告 - ${warningType}: ${details}`, 'system-monitor', 'system');
  };

  // 測試用的手動發送日誌功能
  const handleSendTestLog = async () => {
    if (!message.trim()) return;
    
    try {
      await sendLogToRemote('INFO', message, 'web-test', 'test-user');
      alert('日誌傳送成功！');
      setMessage('');
    } catch (error) {
      alert('日誌傳送失敗：' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h3>日誌傳送測試</h3>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="輸入測試日誌訊息..."
          style={{ width: '70%', padding: '5px', marginRight: '10px' }}
        />
        <button onClick={handleSendTestLog}>傳送測試日誌</button>
      </div>
      
      <h4>使用範例：</h4>
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
        <p><strong>在其他組件中使用：</strong></p>
        <code style={{ display: 'block', whiteSpace: 'pre', backgroundColor: '#fff', padding: '10px' }}>
{`// 1. 記錄使用者操作
import { logUserAction } from '../../services/adminApi';
await logUserAction('張三', '啟動容器', 'Ubuntu容器，GPU-0');

// 2. 記錄系統操作  
import { logSystemAction } from '../../services/adminApi';
await logSystemAction('GPU狀態檢查', '4個GPU正常運行');

// 3. 記錄錯誤日誌
import { sendLogToRemote } from '../../services/adminApi';
await sendLogToRemote('ERROR', '容器啟動失敗：記憶體不足', 'container', 'user123');`}
        </code>
      </div>
    </div>
  );
};

export default LoggingExamples;