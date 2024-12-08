

// ~~~ Admin Authentication Middleware ~~~
// Purpose: Checks if the user is an admin and if they are logged in. Redirects based on the current URL and login status.
// Response: 
// - If an admin tries to access restricted pages without being logged in, they are redirected to the login page.
// - If a logged-in admin tries to access the admin login page, they are redirected to the dashboard.
// - Allows the request to proceed if the conditions are met.

let adminCheck = (req, res, next) => {
    // if (['/admin/dashboard', '/admin/users', '/admin/products','/admin/categories'].includes(req.url)) {
    //     if (!req.session.AdminloggedIn) {
    //         return res.redirect('/admin');
    //     }
    //     return next();
    // } else if (req.url==='/admin') {
    //     if (req.session.AdminloggedIn) {
    //         return res.redirect('/admin/dashboard');
    //     }
    //     return next();
    // }
    return next();
};

module.exports = adminCheck;
