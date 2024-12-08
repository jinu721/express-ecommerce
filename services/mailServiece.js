const nodemailer = require("nodemailer");

// ~~~ The `nodemailer.createTransport()` method is used to configure the email sending service. 
// ~~~ In this case, the service is set to use Gmail as the email provider. 
// ~~~ The `auth` object contains the email credentials, such as the `user` and `pass`, which are securely stored in environment variables.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ~~~ The `sendOtpEmail` function is responsible for sending the OTP (One-Time Password) to the user's email address. 
// ~~~ It accepts two parameters: `email`, which is the recipient's email address, and `otp`, which is the one-time password to be sent.
// ~~~ The `mailOptions` object defines the details of the email, including the `from` address, the recipient's `to` address, 
// ~~~ the email `subject`, and the `text` which contains the OTP message with its validity duration.
const sendOtpEmail = async (email, otp) => {
  // ~~~ mail option have from(admin or authority email),to(user email),subject(topic to send mail),and the text
  const mailOptions = {
    from: process.env.EMAIL_USER, 
    to: email,  
    subject: "Your OTP Code",  
    text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,  
  };

  try {
    // ~~~ The `transporter.sendMail()` method is called to send the email with the specified `mailOptions`.
    // ~~~ If the email is sent successfully, a success message is logged to the console.
    await transporter.sendMail(mailOptions);
    console.log("OTP sent successfully");
  } catch (error) {
    // ~~~ If there is an error in sending the email (e.g., network issue, invalid credentials), 
    // ~~~ the error is caught and logged to the console.
    console.error("Error sending OTP:", error);
  }
};

module.exports = { sendOtpEmail };
