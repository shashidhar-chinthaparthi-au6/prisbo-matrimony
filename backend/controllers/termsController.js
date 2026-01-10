import TermsAndConditions from '../models/TermsAndConditions.js';
import User from '../models/User.js';

// @desc    Get current terms for role
// @route   GET /api/terms/current
// @access  Private
export const getCurrentTerms = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Get active terms for the user's role or 'all'
    const terms = await TermsAndConditions.findOne({
      $or: [
        { forRole: userRole, isActive: true },
        { forRole: 'all', isActive: true },
      ],
    }).sort({ createdAt: -1 });

    if (!terms) {
      // Return default terms if none exist in database
      return res.status(200).json({
        success: true,
        terms: {
          version: '1.0',
          content: getDefaultTermsContent(userRole),
          forRole: userRole,
        },
      });
    }

    res.status(200).json({
      success: true,
      terms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Accept terms
// @route   POST /api/terms/accept
// @access  Private
export const acceptTerms = async (req, res) => {
  try {
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: 'Terms version is required',
      });
    }

    // Update user to mark terms as accepted
    await User.findByIdAndUpdate(req.user.id, {
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsVersion: version,
    });

    res.status(200).json({
      success: true,
      message: 'Terms and conditions accepted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to get default terms content
const getDefaultTermsContent = (role) => {
  const baseTerms = `
    <h2>Terms and Conditions</h2>
    <p>Welcome to Prisbo Matrimony Platform. By using our services, you agree to the following terms and conditions:</p>
    
    <h3>1. Acceptance of Terms</h3>
    <p>By accessing and using this platform, you accept and agree to be bound by the terms and conditions of use.</p>
    
    <h3>2. User Responsibilities</h3>
    <p>You are responsible for maintaining the confidentiality of your account and password. You agree to provide accurate and complete information.</p>
    
    <h3>3. Privacy</h3>
    <p>Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your information.</p>
    
    <h3>4. Prohibited Activities</h3>
    <p>You agree not to engage in any unlawful or prohibited activities on this platform.</p>
    
    <h3>5. Service Modifications</h3>
    <p>We reserve the right to modify or discontinue the service at any time without prior notice.</p>
    
    <h3>6. Limitation of Liability</h3>
    <p>We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.</p>
    
    <h3>7. Contact Information</h3>
    <p>For any questions regarding these terms, please contact our support team.</p>
    
    <p><strong>By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</strong></p>
  `;

  if (role === 'vendor') {
    return baseTerms + `
      <h3>8. Vendor-Specific Terms</h3>
      <p>As a vendor, you are responsible for the profiles you create and manage. You must ensure all information provided is accurate and complies with our guidelines.</p>
    `;
  }

  return baseTerms;
};

