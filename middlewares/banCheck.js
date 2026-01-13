const userModal = require('../models/userModel');

let banCheck = async (req, res, next) => {
    console.log("banCheck Middleware: ", req.url, "Session:", !!req.session.loggedIn);

    const skipRoutes = ['/login', '/register', '/logout', '/ban', '/css/', '/js/', '/img/', '/favicon', '/api/'];
    if (skipRoutes.some(route => req.url.includes(route))) {
        return next();
    }

    if (req.session.loggedIn && req.session.currentId) {
        try {
            const user = await userModal.findById(req.session.currentId);
            
            if (user && user.isDeleted && user.role !== 'admin') {
                console.log("User is banned, logging out:", user.email);
                
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                    
                    res.clearCookie('connect.sid');
                    
                    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                        return res.status(403).json({
                            banned: true,
                            message: 'Your account has been banned.',
                            redirect: '/login'
                        });
                    }
                    
                    return res.redirect('/login?banned=true');
                });
                return; 
            }
        } catch (error) {
            console.error('Ban check error:', error);
        }
    }
    return next();
};

module.exports = banCheck;
