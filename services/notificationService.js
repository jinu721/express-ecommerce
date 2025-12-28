/**
 * Notification Service with Socket.IO
 * Handles real-time notifications for users and admins
 */
class NotificationService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socket.id mapping
  }

  /**
   * Initialize Socket.IO
   * @param {Object} io - Socket.IO instance
   */
  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Authenticate user
      const userId = socket.handshake.auth.userId;
      const userRole = socket.handshake.auth.userRole;

      if (userId) {
        // Map user to socket
        this.userSockets.set(userId, socket.id);
        
        // Join user-specific room
        socket.join(`user:${userId}`);
        
        // Join role-specific room
        if (userRole === 'admin') {
          socket.join('admins');
        } else {
          socket.join('users');
        }

        console.log(`User ${userId} (${userRole}) joined`);
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        if (userId) {
          this.userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
        }
      });

      // Handle custom events
      socket.on('mark_notification_read', async (notificationId) => {
        await this.markNotificationAsRead(notificationId, userId);
      });
    });
  }

  /**
   * Notify specific user
   * @param {String} userId - User ID
   * @param {Object} notification - Notification data
   */
  notifyUser(userId, notification) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    const notificationData = {
      id: notification._id || Date.now(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      timestamp: new Date(),
      read: false
    };

    // Emit to user's room
    this.io.to(`user:${userId}`).emit('notification', notificationData);
    
    console.log(`Notification sent to user ${userId}:`, notificationData.title);
  }

  /**
   * Notify all admins
   * @param {Object} notification - Notification data
   */
  notifyAdmins(notification) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    const notificationData = {
      id: notification._id || Date.now(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      timestamp: new Date(),
      read: false
    };

    // Emit to admins room
    this.io.to('admins').emit('notification', notificationData);
    
    console.log('Notification sent to all admins:', notificationData.title);
  }

  /**
   * Broadcast to all connected users
   * @param {Object} notification - Notification data
   */
  broadcastToAll(notification) {
    if (!this.io) {
      console.warn('Socket.IO not initialized');
      return;
    }

    this.io.emit('notification', {
      id: notification._id || Date.now(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      timestamp: new Date(),
      read: false
    });
  }

  /**
   * Notify user about order status change
   * @param {String} userId - User ID
   * @param {Object} order - Order object
   * @param {String} newStatus - New order status
   */
  notifyOrderStatusChange(userId, order, newStatus) {
    const statusMessages = {
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
      returned: 'Your order return has been processed'
    };

    this.notifyUser(userId, {
      type: 'order_status',
      title: 'Order Status Update',
      message: statusMessages[newStatus] || 'Your order status has been updated',
      data: {
        orderId: order._id,
        orderNumber: order.orderId,
        status: newStatus,
        trackingUrl: order.trackingUrl || null
      }
    });
  }

  /**
   * Notify admins about new order
   * @param {Object} order - Order object
   */
  notifyNewOrder(order) {
    this.notifyAdmins({
      type: 'new_order',
      title: 'New Order Received',
      message: `Order #${order.orderId} - ₹${order.totalAmount}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderId,
        totalAmount: order.totalAmount,
        customerName: order.user.username || 'Customer'
      }
    });
  }

  /**
   * Notify admins about return request
   * @param {Object} order - Order object
   * @param {String} reason - Return reason
   */
  notifyReturnRequest(order, reason) {
    this.notifyAdmins({
      type: 'return_request',
      title: 'Return Request',
      message: `Return requested for Order #${order.orderId}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderId,
        reason: reason
      }
    });
  }

  /**
   * Notify admins about low stock
   * @param {Object} variant - Variant object
   */
  notifyLowStock(variant) {
    this.notifyAdmins({
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${variant.product.name} (${variant.attributes.size}/${variant.attributes.color}) - ${variant.availableStock} units left`,
      data: {
        variantId: variant._id,
        sku: variant.sku,
        stock: variant.availableStock,
        threshold: variant.lowStockThreshold
      }
    });
  }

  /**
   * Notify user about payment status
   * @param {String} userId - User ID
   * @param {Object} payment - Payment data
   */
  notifyPaymentStatus(userId, payment) {
    const statusMessages = {
      success: 'Payment successful',
      failed: 'Payment failed',
      pending: 'Payment is being processed'
    };

    this.notifyUser(userId, {
      type: 'payment_status',
      title: 'Payment Update',
      message: statusMessages[payment.status] || 'Payment status updated',
      data: {
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status
      }
    });
  }

  /**
   * Mark notification as read (to be implemented with notification model)
   * @param {String} notificationId - Notification ID
   * @param {String} userId - User ID
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      // TODO: Update notification model when implemented
      console.log(`Marking notification ${notificationId} as read for user ${userId}`);
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  }

  /**
   * Get connected users count
   * @returns {Number} Number of connected users
   */
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Check if user is online
   * @param {String} userId - User ID
   * @returns {Boolean} Online status
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }
}

module.exports = new NotificationService();
