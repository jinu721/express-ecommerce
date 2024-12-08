const walletModel = require("../models/walletModel");

module.exports = {
  // ~~~ Load Wallet Page ~~~
  // Purpose: Retrieves the wallet information for the logged-in user.
  // It also sorts the transaction history in descending order based on transaction date.
  // Response: Returns the wallet details, including transaction history if found.
  // If no wallet is found, returns an error message.
  async walletPageLoad(req, res) {
    const { currentId } = req.session;
    try {
      const wallet = await walletModel.findOne({ userId: currentId }).lean();
      console.log(wallet);
      if (!wallet) {
        return res.status(400).json({ val: false, msg: "No wallet found!" });
      }
      if (wallet && wallet.transactionHistory) {
        wallet.transactionHistory.sort(
          (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
        );
      }
      console.log(wallet);
      res.status(200).json({ val: true, wallet });
    } catch (err) {
      console.log(err);
      res.status(500).json({ val: false, msg: err });
    }
  },
};
