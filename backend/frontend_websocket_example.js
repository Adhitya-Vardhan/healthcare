
// Frontend JavaScript WebSocket integration example

class HealthcareWebSocketManager {
    constructor(jwtToken) {
        this.jwtToken = jwtToken;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageHandlers = {};
    }
    
    connect() {
        const wsUrl = `ws://localhost:8000/api/ws?token=${this.jwtToken}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = (event) => {
            console.log('✅ WebSocket connected');
            this.reconnectAttempts = 0;
            this.onConnectionOpen(event);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };
        
        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket disconnected');
            this.onConnectionClose(event);
            this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    
    send(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('⚠️ WebSocket not connected');
        }
    }
    
    handleMessage(message) {
        const { type, data } = message;
        
        // Call registered handlers
        if (this.messageHandlers[type]) {
            this.messageHandlers[type](data);
        }
        
        // Default handlers
        switch (type) {
            case 'upload_progress':
                this.updateUploadProgress(data);
                break;
            case 'upload_complete':
                this.showUploadComplete(data);
                break;
            case 'upload_error':
                this.showUploadError(data);
                break;
            case 'patient_created':
                this.showPatientNotification('created', data);
                break;
            case 'patient_updated':
                this.showPatientNotification('updated', data);
                break;
            case 'patient_deleted':
                this.showPatientNotification('deleted', data);
                break;
            case 'notification':
                this.showNotification(data);
                break;
        }
    }
    
    // Register custom message handlers
    onMessage(type, handler) {
        this.messageHandlers[type] = handler;
    }
    
    // UI update methods
    updateUploadProgress(data) {
        const progressBar = document.getElementById('upload-progress');
        const progressText = document.getElementById('upload-text');
        
        if (progressBar) {
            progressBar.style.width = `${data.progress}%`;
            progressBar.setAttribute('aria-valuenow', data.progress);
        }
        
        if (progressText) {
            progressText.textContent = data.message || `${data.progress}% complete`;
        }
    }
    
    showUploadComplete(data) {
        this.showNotification({
            message: `Upload completed: ${data.successful_records}/${data.total_records} records processed`,
            notification_type: 'success'
        });
        
        // Hide progress bar
        const progressContainer = document.getElementById('upload-progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // Refresh patient list
        if (window.refreshPatientList) {
            window.refreshPatientList();
        }
    }
    
    showUploadError(data) {
        this.showNotification({
            message: `Upload failed: ${data.error}`,
            notification_type: 'error'
        });
    }
    
    showPatientNotification(action, data) {
        const message = `Patient ${action}: ${data.patient_name}`;
        this.showNotification({
            message: message,
            notification_type: 'info'
        });
        
        // Refresh patient list
        if (window.refreshPatientList) {
            window.refreshPatientList();
        }
    }
    
    showNotification(data) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${data.notification_type}`;
        notification.textContent = data.message;
        
        // Add to notification container
        const container = document.getElementById('notifications') || document.body;
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`⏳ Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }
    
    onConnectionOpen(event) {
        // Connection established - can send initial messages
        this.send({ type: 'ping' });
    }
    
    onConnectionClose(event) {
        // Handle connection close
        if (event.code !== 1000) {
            console.warn('⚠️ WebSocket closed unexpectedly:', event.code, event.reason);
        }
    }
}

// Usage example:
// const wsManager = new HealthcareWebSocketManager(jwtToken);
// wsManager.connect();
//
// // Custom message handler
// wsManager.onMessage('custom_event', (data) => {
//     console.log('Custom event received:', data);
// });
