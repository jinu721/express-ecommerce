const userModal = require('../models/userModel');

// ~~~ Simplified Ban Check Middleware ~~~
let banCheck = async (req, res, next) => {
    console.log("banCheck Middleware: ", req.url, "Session:", !!req.session.loggedIn);

    // Skip ban check for certain routes
    const skipRoutes = ['/login', '/register', '/logout', '/ban', '/css/', '/js/', '/img/', '/favicon'];
    if (skipRoutes.some(route => req.url.includes(route))) {
        return next();
    }

    if (req.session.loggedIn && req.session.userEmail) {
        try {
            const user = await userModal.findOne({ email: req.session.userEmail });
            
            if (user && user.isDeleted && user.role !== 'admin') {
                console.log("User is banned, logging out:", user.email);
                
                // Simply destroy session and redirect to login
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                });
                
                // For AJAX requests
                if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                    return res.status(403).json({
                        banned: true,
                        message: 'Your account has been banned.',
                        redirect: '/login'
                    });
                }
                
                // For regular requests, redirect to login
                return res.redirect('/login');
            }
        } catch (error) {
            console.error('Ban check error:', error);
        }
    }
    return next();
};

module.exports = banCheck;

module.exports = banCheck;
