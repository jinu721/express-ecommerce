let authCheck = (req, res, next) => {
    console.log("authCheck Middleware: ", req.url);
    
    if (['/account', '/wishlist', '/cart'].includes(req.url)) {
        if (!req.session.loggedIn) {
            console.log("Redirecting to /register from authCheck");
            return res.redirect('/register');
        }
        return next();
    } else if (['/register', '/login'].includes(req.url)) {
        if (req.session.loggedIn) {
            console.log("Redirecting to / from authCheck");
            return res.redirect('/');
        }
        return next();
    }
    return next();
};

module.exports = authCheck;
