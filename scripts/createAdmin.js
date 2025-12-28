const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import the user model
const userModel = require('../models/userModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jinan:DvADDZokaVlpdRGV@cluster0.ox2k8.mongodb.net/Ecommerce?retryWrites=true&w=majority');

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    
    const adminUser = await userModel.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      phone: 1234567890
    });

    console.log('Admin user created successfully:');
    console.log('Username: admin');
    console.log('Email: admin@example.com');
    console.log('Password: admin@123');
    console.log('Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();