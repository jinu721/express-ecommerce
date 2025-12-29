const mongoose = require('mongoose');
const Order = require('../models/orderModel');

// Connect to MongoDB
mongoose.connect('mongodb+srv://jinan:DvADDZokaVlpdRGV@cluster0.ox2k8.mongodb.net/Ecommerce?retryWrites=true&w=majority');

async function fixProcessingOrders() {
  try {
    console.log('Starting to fix orders with processing status...');
    
    // Find all orders with processing status
    const orders = await Order.find({ orderStatus: 'processing' });
    console.log(`Found ${orders.length} orders with processing status`);
    
    for (const order of orders) {
      console.log(`Fixing order ${order.orderId || order._id}`);
      
      // Ensure required fields have default values
      if (!order.subtotal) {
        order.subtotal = order.totalAmount || 0;
      }
      
      // Ensure item fields have default values
      order.items.forEach(item => {
        if (!item.originalPrice) item.originalPrice = item.offerPrice || 0;
        if (!item.offerPrice) item.offerPrice = item.originalPrice || 0;
        if (!item.totalPrice) item.totalPrice = (item.offerPrice || 0) * (item.quantity || 1);
      });
      
      // Ensure status history exists
      if (!order.statusHistory || order.statusHistory.length === 0) {
        order.statusHistory = [{
          status: 'processing',
          updatedAt: order.orderedAt || new Date(),
          updatedBy: 'system',
          message: 'Order created with processing status'
        }];
      }
      
      await order.save();
      console.log(`Fixed order ${order.orderId || order._id}`);
    }
    
    console.log('All processing orders have been fixed!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing processing orders:', error);
    process.exit(1);
  }
}

fixProcessingOrders();