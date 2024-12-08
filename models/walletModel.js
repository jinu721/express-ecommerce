const mongoose = require('mongoose');


// ~~~ Wallet Schema ~~~
// Purpose: Defines the structure for managing wallet data, including user balances and transaction history.
// Fields:
// - `userId`: The ID of the user who owns the wallet (required).
// - `balance`: The current balance of the user's wallet (default: 0).
// - `transactionHistory`: An array of transaction records for deposits, refunds, purchases, wallet-to-wallet transfers, and manual entries.
// - `createdAt`: The timestamp when the wallet record was created (default: current date).
// - `updatedAt`: The timestamp when the wallet record was last updated (default: current date).


const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users', 
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  transactionHistory: [
    {
      transactionType: {
        type: String,
        enum: ['deposit', 'refund', 'purchase', 'wallet-to-wallet', 'manual'],
        required: true
      },
      transactionAmount: {
        type: Number,
        required: true
      },
      transactionDate: {
        type: Date,
        default: Date.now
      },
      description: {
        type: String,
        default: ''
      }
    }
  ],
},{timestamps:true});


module.exports = mongoose.model('Wallets', walletSchema);;
