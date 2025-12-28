/**
 * iOS-style Toast Notification System
 * Replaces SweetAlert and browser alerts with modern iOS-style notifications
 */
class Toast {
  static show(options) {
    const toast = document.createElement('div');
    toast.className = 'toast-container';
    
    const icon = options.type === 'success' ? '✓' : 
                 options.type === 'error' ? '✕' : 
                 options.type === 'warning' ? '⚠' : 'ℹ';
    
    toast.innerHTML = `
      <div class="toast toast-${options.type || 'info'}">
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
          <div class="toast-title">${options.title || ''}</div>
          <div class="toast-message">${options.message || ''}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Show animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto hide
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, options.duration || 3000);
  }
  
  static success(title, message) {
    this.show({ type: 'success', title, message });
  }
  
  static error(title, message) {
    this.show({ type: 'error', title, message });
  }
  
  static warning(title, message) {
    this.show({ type: 'warning', title, message });
  }
  
  static info(title, message) {
    this.show({ type: 'info', title, message });
  }
}

// Make Toast available globally
window.Toast = Toast;