const userModal = require('../models/userModel');


// ~~~ Ban Check Middleware ~~~
// Purpose: Checks if the logged-in user has been banned and redirects them to the ban page if necessary.
// Response:
// - If the user is logged in and their account is marked as deleted (banned), they are redirected to a ban page.
// - If the user is not banned or not logged in, the request proceeds normally.

let banCheck = async (req, res, next) => {
    console.log("banCheck Middleware: ", req.url);

    if (req.session.loggedIn) {
        const email = req.session.userEmail;
        const user = await userModal.findOne({ email });
        if (user && user.isDeleted) {
            console.log("Rendering ban page from banCheck");
            return res.render('ban');
        }
    }
    return next();
};

module.exports = banCheck;
