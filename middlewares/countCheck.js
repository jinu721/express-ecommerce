const cartModel = require('../models/cartModel');
const wishlistModel = require('../models/wishlistModel');
const notifyModel = require('../models/notificationModel');


// ~~~ Count Check Middleware ~~~
// Purpose: This middleware checks the counts of cart items, wishlist items, and notifications for the logged-in user.
// It updates `res.locals` with these counts so they can be accessed in views or templates.
// Response: 
// - Adds the cart, wishlist, and notification counts to `res.locals`.
// - The counts are updated for each user based on their session data.

const countCheck = async (req, res, next) => {
    try {
        if (req.session.loggedIn) {
            const cart = await cartModel.findOne({ userId: req.session.currentId });
            const wishlist = await wishlistModel.findOne({ userId: req.session.currentId });
            const notify = await notifyModel.find({ userId: req.session.currentId });
            res.locals.cartCount = cart?.items?.length || 0; 
            res.locals.wishlistCount = wishlist?.items?.length || 0;
            console.log(`Notifications count ${notify.length}`) 
            res.locals.notifyCount = notify?.length || 0; 
            console.log(`Notifications count2 ${res.locals.notifyCount}`) 
            return next();
        } else {
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
            res.locals.notifyCount =  0; 
        }
        return next();
    } catch (err) {
        console.error("Error in countCheck middleware:", err);
        return next(err); 
    }
};

module.exports = countCheck;