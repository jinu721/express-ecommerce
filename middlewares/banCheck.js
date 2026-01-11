const userModal = require('../models/userModel');

// ~~~ Simplified Ban Check Middleware ~~~
let banCheck = async (req, res, next) => {
    console.log("banCheck Middleware: ", req.url, "Session:", !!req.session.loggedIn);

    // Skip ban check for certain routes
    const skipRoutes = ['/login', '/register', '/logout', '/ban', '/css/', '/js/', '/img/', '/favicon', '/api/'];
    if (skipRoutes.some(route => req.url.includes(route))) {
        return next();
    }

    if (req.session.loggedIn && req.session.currentId) {
        try {
            const user = await userModal.findById(req.session.currentId);
            
            if (user && user.isDeleted && user.role !== 'admin') {
                console.log("User is banned, logging out:", user.email);
                
                // Destroy session
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    
                    // Clear cookie
                    res.clearCookie('connect.sid');
                    
                    // For AJAX requests
                    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                        return res.status(403).json({
                            banned: true,
                            message: 'Your account has been banned.',
                            redirect: '/login'
                        });
                    }
                    
                    // For regular requests, redirect to login
                    return res.redirect('/login?banned=true');
                });
                return; // Important: don't call next()
            }
        } catch (error) {
            console.error('Ban check error:', error);
        }
    }
    return next();
};

module.exports = banCheck;
