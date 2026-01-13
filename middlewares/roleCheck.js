const userModal = require('../models/userModel');


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
