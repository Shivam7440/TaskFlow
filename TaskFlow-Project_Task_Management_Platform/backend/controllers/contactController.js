const { sendContactFormEmail } = require('../utils/emailService');

// @desc    Handle contact form submission
// @route   POST /api/contact
// @access  Public
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Send email to admin
    await sendContactFormEmail({ name, email, subject, message });

    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you shortly!'
    });
  } catch (error) {
    console.error('Contact Form Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
};
