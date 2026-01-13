const cartModel = require('../models/cartModel');
const wishlistModel = require('../models/wishlistModel');

const countCheck = async (req, res, next) => {
    try {
        if (req.session.loggedIn) {
            const cart = await cartModel.findOne({ userId: req.session.currentId });
            const wishlist = await wishlistModel.findOne({ userId: req.session.currentId });
            res.locals.cartCount = cart?.items?.length || 0; 
            res.locals.wishlistCount = wishlist?.items?.length || 0;
            return next();
        } else {
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
        }
        return next();
    } catch (err) {
        console.error("Error in countCheck middleware:", err);
        return next(err); 
    }
};

module.exports = countCheck;