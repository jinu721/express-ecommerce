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
    const duration = options.duration !== undefined ? options.duration : 3000;

    if (duration > 0) {
      setTimeout(() => {
        this.hide(toast);
      }, duration);
    }

    return toast;
  }

  static hide(toast) {
    if (!toast) return;
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  static success(title, message, options = {}) {
    return this.show({ type: 'success', title, message, ...options });
  }

  static error(title, message, options = {}) {
    return this.show({ type: 'error', title, message, ...options });
  }

  static warning(title, message, options = {}) {
    return this.show({ type: 'warning', title, message, ...options });
  }

  static info(title, message, options = {}) {
    return this.show({ type: 'info', title, message, ...options });
  }

  // Confirmation dialog
  static confirm(options) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'toast-confirm-overlay';

      modal.innerHTML = `
        <div class="toast-confirm-container">
          <div class="toast-confirm-header">
            <div class="toast-confirm-icon ${options.type || 'warning'}">
              ${options.type === 'error' ? '⚠' : options.type === 'success' ? '✓' : '?'}
            </div>
            <h3 class="toast-confirm-title">${options.title || 'Confirm'}</h3>
          </div>
          <div class="toast-confirm-content">
            <p class="toast-confirm-message">${options.message || 'Are you sure?'}</p>
          </div>
          <div class="toast-confirm-actions">
            <button class="toast-btn toast-btn-cancel">${options.cancelText || 'Cancel'}</button>
            <button class="toast-btn toast-btn-confirm ${options.type || 'warning'}">${options.confirmText || 'Confirm'}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';

      // Show animation
      setTimeout(() => modal.classList.add('show'), 10);

      // Event listeners
      const cancelBtn = modal.querySelector('.toast-btn-cancel');
      const confirmBtn = modal.querySelector('.toast-btn-confirm');

      const cleanup = () => {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        setTimeout(() => document.body.removeChild(modal), 300);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });
    });
  }
}

// Make Toast available globally
window.Toast = Toast;