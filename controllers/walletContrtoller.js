const walletModel = require("../models/walletModel");

module.exports = {

  async walletPageLoad(req, res) {
    const { currentId } = req.session;
    const { page = 1, limit = 10 } = req.query; 
    try {
      let wallet = await walletModel.findOne({ userId: currentId }).lean();
      
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
