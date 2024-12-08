const express = require('express');
const app = express();
const path = require('path');
require("dotenv").config();  
const session = require('express-session');  
const connect = require("./config/mongo");  
connect();

// ~~~ Importing routes for different sections of the application ~~~
const usersRoutes = require('./routes/usersRoutes');
const accountRoutes = require('./routes/accountRoutes');
const productsRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRotes');
const couponRoutes = require('./routes/couponRoutes');
const notifyRoutes = require('./routes/notificationRoutes');
require('./services/authServiece');  

// ~~~ Importing middleware for various checks and functionality ~~~
const authCheck = require('./middlewares/authCheck');
const banCheck = require('./middlewares/banCheck');
const roleCheck = require('./middlewares/roleCheck');
const hideLogin = require('./middlewares/hideLogin');
const countCheck = require('./middlewares/countCheck');
const adminCheck = require('./middlewares/adminAuth');
const visitorsCheck = require('./middlewares/countViewers');
const brudCrumbsMiddleware = require('./middlewares/brudCrumbs');

// ~~~ View engine setup ~~~
// Purpose: Set EJS as the templating engine and specify the directories for views
app.set('view engine','ejs');
app.set('views', [path.join(__dirname, 'views', 'user'), path.join(__dirname, 'views', 'admin')]);

// ~~~ Static files setup ~~~
// Purpose: Serve static files like CSS, JavaScript, images, etc.
app.use(express.static(path.join(__dirname,'public')))

// ~~~ Body parser setup ~~~
// Purpose: Parse incoming request bodies (URL encoded and JSON)
app.use(express.urlencoded({extended:true}));
app.use(express.json());

// ~~~ Session cookie setup ~~~
// Purpose: Setup session management to store user session data
app.use(session({
    secret:'key273636keySectret',  // Secret key to encrypt session data
    resave:false,
    saveUninitialized:false,
    cookie:{maxAge:1000*60*60*24*30}  // Session expiration time (30 days)
}));

// ~~~ Middlewares setup ~~~
// Purpose: Apply middleware functions for various functionalities and checks
app.use(authCheck); 
app.use(banCheck);   
app.use(roleCheck);  
app.use(hideLogin);  
app.use(countCheck);
app.use(adminCheck); 
app.use(visitorsCheck);
app.use(brudCrumbsMiddleware);  

// ~~~ Cache control for register route ~~~
// Purpose: Disable caching for the register route to ensure fresh content on each visit
app.use('/register', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// ~~~ User routes setup ~~~
// Purpose: Define routes for user-related functionality
app.use('/', usersRoutes);
app.use('/', accountRoutes);
app.use('/', productsRoutes);
app.use('/', authRoutes); 
app.use('/', adminRoutes); 
app.use('/', wishlistRoutes); 
app.use('/', categoryRoutes); 
app.use('/', cartRoutes); 
app.use('/', checkoutRoutes); 
app.use('/', orderRoutes); 
app.use('/', walletRoutes); 
app.use('/', couponRoutes); 
app.use('/', notifyRoutes); 

// ~~~ 404 route ~~~
// Purpose: Catch-all route for undefined routes, rendering the 404 page
app.get('/*', (req, res) => {
    res.render('404');  
});

app.use((err,req,res,next)=>{
    console.log(err)
    next()
})

// ~~~ Server setup ~~~
// Purpose: Start the server on port 3000
app.listen(3000, () => {
    console.log('Server started on :- http://localhost:3000/');
});
