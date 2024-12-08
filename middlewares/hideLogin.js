
// ~~~ Hide Login Middleware ~~~
// Purpose: This middleware adds a flag to the response locals to indicate whether the user is logged in or not.
// Response:
// - Adds a `isLoggedIn` flag to `res.locals` based on the user's login status from the session.

let hideLogin = (req,res,next)=>{
    res.locals.isLoggedIn = req.session.loggedIn?true:false;
    return next()
}

module.exports = hideLogin;