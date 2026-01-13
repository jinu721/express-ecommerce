let hideLogin = (req,res,next)=>{
    res.locals.isLoggedIn = req.session.loggedIn?true:false;
    return next()
}

module.exports = hideLogin;