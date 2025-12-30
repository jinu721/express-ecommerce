const express = require('express');
const app = express();
const path = require('path');
const morgan = require("morgan");
require("dotenv").config();  
const session = require('express-session');  
const connect = require("./config/mongo");  
connect();

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

const variantRoutes = require('./routes/variantRoutes');
const offerRoutes = require('./routes/offerRoutes');
const brandRoutes = require('./routes/brandRoutes');
require('./services/authServiece');  

const authCheck = require('./middlewares/authCheck');
const banCheck = require('./middlewares/banCheck');
const roleCheck = require('./middlewares/roleCheck');
const hideLogin = require('./middlewares/hideLogin');
const countCheck = require('./middlewares/countCheck');
const adminCheck = require('./middlewares/adminAuth');
const brudCrumbsMiddleware = require('./middlewares/brudCrumbs');

app.set('view engine','ejs');
app.set('views', [path.join(__dirname, 'views', 'user'), path.join(__dirname, 'views', 'admin')]);
app.use(express.static(path.join(__dirname,'public')))

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(morgan("dev"));

const sessionMiddleware = session({
    secret:'key273636keySectret',  
    resave:false,
    saveUninitialized:false,
    cookie:{maxAge:1000*60*60*24*30} 
});

app.use(sessionMiddleware);

app.use(authCheck); 
app.use(banCheck);   
app.use(roleCheck);  
app.use(hideLogin);  
app.use(countCheck);
app.use(adminCheck); 
app.use(brudCrumbsMiddleware);

app.use('/register', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});


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

app.use('/', variantRoutes);
app.use('/', offerRoutes);
app.use('/', brandRoutes);

app.get('/*', (req, res) => {
    res.render('404');  
});

app.use((err,req,res,next)=>{
    console.log(err)
    next()
})

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server started on: http://localhost:${PORT}/`);
});

module.exports = app;
