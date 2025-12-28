const userModal = require('../models/userModel');

// ~~~ Enhanced Ban Check Middleware ~~~
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
            console.log("Ban check - User found:", !!user, "isDeleted:", user?.isDeleted, "role:", user?.role);
            
            if (user && user.isDeleted && user.role !== 'admin') {
                console.log("User is banned, handling ban for:", user.email);
                
                // Clear the session immediately
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                    }
                });
                
                // Set headers to prevent caching
                res.set({
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                });
                
                // Check if it's an AJAX request
                if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
                    return res.status(403).json({
                        banned: true,
                        message: 'Your account has been banned. You will be logged out.',
                        redirect: '/ban'
                    });
                }
                
                // For regular requests, serve ban page with auto-logout script
                return res.status(403).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Account Banned</title>
                        <link rel="stylesheet" href="/css/ios-toast.css">
                        <style>
                            body {
                                margin: 0;
                                padding: 0;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                min-height: 100vh;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .ban-container {
                                background: rgba(255, 255, 255, 0.95);
                                backdrop-filter: blur(20px);
                                -webkit-backdrop-filter: blur(20px);
                                border: 1px solid rgba(255, 255, 255, 0.3);
                                border-radius: 20px;
                                padding: 48px;
                                text-align: center;
                                max-width: 500px;
                                width: 90%;
                                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12),
                                            0 8px 24px rgba(0, 0, 0, 0.08),
                                            inset 0 1px 0 rgba(255, 255, 255, 0.6);
                            }
                            .ban-icon {
                                font-size: 64px;
                                color: #ff3b30;
                                margin-bottom: 24px;
                            }
                            .ban-title {
                                font-size: 28px;
                                font-weight: 700;
                                color: #1d1d1f;
                                margin-bottom: 16px;
                            }
                            .ban-message {
                                font-size: 16px;
                                color: #48484a;
                                line-height: 1.5;
                                margin-bottom: 32px;
                            }
                            .ban-button {
                                background: linear-gradient(135deg, #007aff, #409cff);
                                color: white;
                                border: none;
                                padding: 16px 32px;
                                border-radius: 12px;
                                font-size: 16px;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
                            }
                            .ban-button:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="ban-container">
                            <div class="ban-icon">🚫</div>
                            <h1 class="ban-title">Account Banned</h1>
                            <p class="ban-message">
                                Your account has been banned by an administrator. 
                                You will be automatically logged out and redirected to the login page.
                            </p>
                            <button class="ban-button" onclick="goToLogin()">Go to Login</button>
                        </div>
                        
                        <script src="/js/ios-toast.js"></script>
                        <script>
                            // Show ban notification
                            if (typeof Toast !== 'undefined') {
                                Toast.error('Account Banned', 'Your account has been banned. You will be logged out.');
                            }
                            
                            // Auto logout and redirect after 3 seconds
                            setTimeout(() => {
                                window.location.href = '/login';
                            }, 3000);
                            
                            function goToLogin() {
                                window.location.href = '/login';
                            }
                            
                            // Prevent back button
                            history.pushState(null, null, location.href);
                            window.onpopstate = function () {
                                history.go(1);
                            };
                        </script>
                    </body>
                    </html>
                `);
            }
        } catch (error) {
            console.error('Ban check error:', error);
        }
    }
    return next();
};

module.exports = banCheck;
