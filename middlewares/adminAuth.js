
let adminCheck = (req, res, next) => {
    if (req.url.startsWith('/admin') && req.url !== '/admin') {
        if (!req.session.loggedIn) {
            return res.redirect('/register');
        }
        
        if (req.session.userRole !== 'admin') {
            return res.redirect('/');
        }
        
        return next();
    }
    
    return next();
};

module.exports = adminCheck;

module.exports = adminCheck;
