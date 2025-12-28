/**
 * iOS-style Toast Notification System
 * Replaces SweetAlert and browser alerts with modern iOS-style notifications
 */

class iOSToast {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast configuration
   * @param {string} options.title - Toast title
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type (success, error, warning, info)
   * @param {number} options.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   * @param {boolean} options.closable - Show close button
   * @param {Function} options.onClose - Callback when toast is closed
   */
  show({
    title = '',
    message = '',
    type = 'info',
    duration = 4000,
    closable = true,
    onClose = null
  } = {}) {
    const toastId = Date.now() + Math.random();
    const toast = this.createToast(toastId, { title, message, type, duration, closable, onClose });
    
    this.container.appendChild(toast);
    this.toasts.set(toastId, toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.hide(toastId);
      }, duration);
    }

    return toastId;
  }

  createToast(id, { title, message, type, duration, closable, onClose }) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.dataset.toastId = id;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '!',
      info: 'i'
    };

    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <h4 class="toast-title">${title}</h4>
        ${closable ? '<button class="toast-close" aria-label="Close">×</button>' : ''}
      </div>
      ${message ? `<p class="toast-message">${message}</p>` : ''}
      ${duration > 0 ? `<div class="toast-progress" style="animation-duration: ${duration}ms; animation-name: progressBar;"></div>` : ''}
    `;

    // Add close button event
    if (closable) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => {
        this.hide(id);
        if (onClose) onClose();
      });
    }

    // Add click to dismiss
    toast.addEventListener('click', (e) => {
      if (!e.target.classList.contains('toast-close')) {
        this.hide(id);
        if (onClose) onClose();
      }
    });

    return toast;
  }

  hide(toastId) {
    const toast = this.toasts.get(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.classList.add('hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(toastId);
    }, 300);
  }

  // Convenience methods
  success(title, message, options = {}) {
    return this.show({ title, message, type: 'success', ...options });
  }

  error(title, message, options = {}) {
    return this.show({ title, message, type: 'error', duration: 6000, ...options });
  }

  warning(title, message, options = {}) {
    return this.show({ title, message, type: 'warning', duration: 5000, ...options });
  }

  info(title, message, options = {}) {
    return this.show({ title, message, type: 'info', ...options });
  }

  // Clear all toasts
  clear() {
    this.toasts.forEach((toast, id) => {
      this.hide(id);
    });
  }

  // Confirmation dialog replacement for SweetAlert
  async confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  } = {}) {
    return new Promise((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.className = 'toast-modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'toast-modal';

      modal.innerHTML = `
        <h3 class="toast-modal-title">${title}</h3>
        <p class="toast-modal-message">${message}</p>
        <div class="toast-modal-buttons">
          <button class="toast-modal-button cancel">${cancelText}</button>
          <button class="toast-modal-button confirm ${type}">${confirmText}</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => {
        overlay.classList.add('show');
      });

      // Event handlers
      const cleanup = () => {
        overlay.classList.remove('show');
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      };

      modal.querySelector('.cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      modal.querySelector('.confirm').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
    });
  }
}

// Create global instance
window.Toast = new iOSToast();

// Backward compatibility - replace common SweetAlert patterns
window.Swal = {
  fire: (titleOrOptions, text, icon) => {
    if (typeof titleOrOptions === 'object') {
      const options = titleOrOptions;
      if (options.showConfirmButton === false || options.timer) {
        // Simple notification
        return Toast.show({
          title: options.title || '',
          message: options.text || options.html || '',
          type: options.icon || 'info',
          duration: options.timer || 4000
        });
      } else if (options.showCancelButton) {
        // Confirmation dialog
        return Toast.confirm({
          title: options.title || 'Confirm',
          message: options.text || '',
          confirmText: options.confirmButtonText || 'OK',
          cancelText: options.cancelButtonText || 'Cancel',
          type: options.icon || 'warning'
        });
      }
    } else {
      // Simple fire(title, text, icon)
      const type = icon || 'info';
      return Toast.show({
        title: titleOrOptions || '',
        message: text || '',
        type: type,
        duration: type === 'error' ? 6000 : 4000
      });
    }
  }
};

// Replace browser alert
window.alert = (message) => {
  Toast.info('Alert', message);
};

// Replace browser confirm
window.confirm = async (message) => {
  return await Toast.confirm({
    title: 'Confirm',
    message: message
  });
};