
// ~~~ Authentication Check Middleware ~~~
// Purpose: Checks if a user is logged in before accessing certain routes and redirects based on login status.
// Response: 
// - If the user tries to access protected routes (e.g., /account, /wishlist, /cart, /notifications) without being logged in, they are redirected to the /register page.
// - If a logged-in user tries to access the login or register pages, they are redirected to the homepage (/).
// - Allows the request to proceed for all other routes.

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
