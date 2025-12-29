const walletModel = require("../models/walletModel");

module.exports = {
  // ~~~ Load Wallet Page ~~~
  // Purpose: Retrieves the wallet information for the logged-in user.
  // It also sorts the transaction history in descending order based on transaction date.
  // Response: Returns the wallet details, including transaction history if found.
  // If no wallet is found, returns an error message.
  async walletPageLoad(req, res) {
    const { currentId } = req.session;
    const { page = 1, limit = 10 } = req.query; 
    try {
      let wallet = await walletModel.findOne({ userId: currentId }).lean();
      
      // If no wallet exists, create an empty wallet for the user
      if (!wallet) {
        const newWallet = await walletModel.create({
          userId: currentId,
          balance: 0,
          transactionHistory: []
        });
        wallet = newWallet.toObject();
      }
      
      if (wallet.transactionHistory && wallet.transactionHistory.length > 0) {
        wallet.transactionHistory.sort(
          (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
        );
        
        const totalTransactions = wallet.transactionHistory.length;
        const startIndex = (page - 1) * limit; 
        const endIndex = page * limit; 
  
        const paginatedTransactions = wallet.transactionHistory.slice(startIndex, endIndex);
        
        wallet.transactionHistory = paginatedTransactions; 
        
        res.status(200).json({
          val: true,
          wallet,
          totalTransactions,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTransactions / limit)
        });
      } else {
        // Return empty wallet with no transactions
        res.status(200).json({
          val: true,
          wallet: {
            ...wallet,
            transactionHistory: []
          },
          totalTransactions: 0,
          currentPage: 1,
          totalPages: 1
        });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err.message });
    }
  }
  
};
