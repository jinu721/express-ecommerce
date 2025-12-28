

// ~~~ Admin Authentication Middleware ~~~
// Purpose: Checks if the user is an admin and if they are logged in. Redirects based on the current URL and login status.
// Response: 
// - If a non-admin tries to access admin pages, they are redirected to the home page.
// - If an admin tries to access restricted pages without being logged in, they are redirected to the login page.
// - Allows the request to proceed if the conditions are met.

let adminCheck = (req, res, next) => {
    // Check if accessing admin routes
    if (req.url.startsWith('/admin') && req.url !== '/admin') {
        // Check if user is logged in
        if (!req.session.loggedIn) {
            return res.redirect('/register');
        }
        
        // Check if user has admin role
        if (req.session.userRole !== 'admin') {
            return res.redirect('/');
        }
        
        return next();
    }
    
    return next();
};

module.exports = adminCheck;

module.exports = adminCheck;
