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
      const wallet = await walletModel.findOne({ userId: currentId }).lean();
      if (!wallet) {
        return res.status(400).json({ val: false, msg: "No wallet found!" });
      }
      
      if (wallet.transactionHistory) {
        wallet.transactionHistory.sort(
          (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
        );
        
        const startIndex = (page - 1) * limit; 
        const endIndex = page * limit; 
  
        const paginatedTransactions = wallet.transactionHistory.slice(startIndex, endIndex);
        
        wallet.transactionHistory = paginatedTransactions; 
      }
  
      res.status(200).json({
        val: true,
        wallet,
        totalTransactions: wallet.transactionHistory.length,
        currentPage: page,
        totalPages: Math.ceil(wallet.transactionHistory.length / limit)
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err });
    }
  }
  
};
