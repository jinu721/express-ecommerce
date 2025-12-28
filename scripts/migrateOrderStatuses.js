const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jinan:DvADDZokaVlpdRGV@cluster0.ox2k8.mongodb.net/Ecommerce?retryWrites=true&w=majority');

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Orders', orderSchema);

async function migrateOrderStatuses() {
  try {
    console.log('Starting order status migration...');
    
    // Status mapping from old to new
    const statusMapping = {
      'processing': 'order_placed',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'returned': 'returned'
    };
    
    // Find all orders with old status format
    const orders = await Order.find({
      orderStatus: { $in: ['processing', 'shipped', 'delivered', 'cancelled', 'returned'] }
    });
    
    console.log(`Found ${orders.length} orders to migrate`);
    
    for (const order of orders) {
      const newStatus = statusMapping[order.orderStatus] || 'order_placed';
      
      // Update order status
      order.orderStatus = newStatus;
      
      // Update item statuses
      if (order.items) {
        order.items.forEach(item => {
          if (item.itemStatus && statusMapping[item.itemStatus]) {
            item.itemStatus = statusMapping[item.itemStatus];
          }
        });
      }
      
      // Update status history
      if (order.statusHistory) {
        order.statusHistory.forEach(history => {
          if (history.status && statusMapping[history.status]) {
            history.status = statusMapping[history.status];
          }
        });
      }
      
      await order.save();
      console.log(`Migrated order ${order.orderId || order._id}`);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateOrderStatuses();