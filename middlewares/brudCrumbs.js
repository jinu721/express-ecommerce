

// ~~~ Breadcrumb Middleware ~~~
// Purpose: This middleware generates breadcrumb navigation links based on the current request URL path.
// It constructs a breadcrumb trail using predefined labels and dynamic URL parameters.
// Response: 
// - Adds the generated breadcrumbs to `res.locals` so they can be accessed in views or templates.
// - Each breadcrumb contains a label and a corresponding URL link.

const breadcrumbLabels = {
    '/': 'Home',
    '/shop': 'Shop',
    '/details': 'Product Details',
    '/account': 'My Account',
    '/account/address': 'Address Management',
    '/account/orders': 'My Orders',
    '/account/wallet': 'My Wallet',
    '/checkout': 'Checkout',
    '/success': 'Order Success',
    '/forgot': 'Forgot Password',
    '/wishlist': 'Wishlist',
    '/notifications': 'Notifications',
    '/product/search': 'Search Results',
    '/product/reviews': 'Product Reviews',
    '/register': 'Register',
    '/login': 'Login',
    '/ban': 'Account Ban',
  };
  

function breadcrumbMiddleware(req, res, next) {
    const pathParts = req.path.split('/').filter(Boolean); 
    const breadcrumbs = [];
    let currentPath = '';
  
    pathParts.forEach((part) => {
      currentPath += `/${part}`;
      if (currentPath.includes(':')) {
        currentPath = currentPath.replace(/:\w+/g, (match) => {
          const paramKey = match.substring(1);
          return req.params[paramKey] || part; 
        });
      }
  
      const label = breadcrumbLabels[currentPath] || part.charAt(0).toUpperCase() + part.slice(1);
      breadcrumbs.push({
        label,
        link: currentPath,
      });
    });
    breadcrumbs.unshift({ label: 'Home', link: '/' });
  
    res.locals.breadcrumbs = breadcrumbs; 
    next();
  }
  
  module.exports = breadcrumbMiddleware;
  