/**
 * Socket.IO Client Configuration
 * Handles real-time connection and global events
 */

const socket = io();

socket.on('connect', () => {
    console.log('Connected to real-time server');
});

socket.on('notification', (data) => {
    // Show toast notification
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: 'info',
            title: data.title || 'Notification',
            text: data.message
        });
    }
    
    // Update notification count badge if it exists
    const notifyCount = document.querySelector('.header__action-btn[href="/notifications"] .count');
    if (notifyCount) {
        let count = parseInt(notifyCount.innerText) || 0;
        notifyCount.innerText = count + 1;
        notifyCount.style.display = 'flex'; // Ensure it's visible
    }
});

// Stock Update Event
socket.on('stockUpdate', (data) => {
    console.log('Stock Update Received:', data);
    // Dispatch a custom event for page-specific scripts to handle
    const event = new CustomEvent('productStockUpdate', { detail: data });
    window.dispatchEvent(event);
});
