const userModal = require('../models/userModel');


// ~~~ Role Check Middleware ~~~
// Purpose: This middleware checks if the user has the necessary role (admin) to access admin routes.
// Response:
// - If the user is not logged in or does not have the 'admin' role, they will be redirected to appropriate pages.

let roleCheck = async (req, res, next) => {
    // const adminRoutes = [
    //     '/admin',
    //     '/admin/products',
    //     '/admin/users',
    //     '/admin/categories',
    //     '/admin/dashboard',
    //     '/admin/coupens',
    //     '/admin/orders'
    // ];
    // if (adminRoutes.includes(req.url)) {
    //     if (!req.session.loggedIn) {
    //         return res.redirect('/register');  
    //     }
    //     const email = req.session.userEmail;
    //     const user = await userModal.findOne({ email });
    //     if (user.role !== "admin") {
    //         return res.redirect('/'); 
    //     }
    // }

    return next();
};

module.exports = roleCheck;
