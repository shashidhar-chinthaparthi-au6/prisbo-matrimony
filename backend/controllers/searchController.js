import Profile from '../models/Profile.js';
import Interest from '../models/Interest.js';
import Favorite from '../models/Favorite.js';
import User from '../models/User.js';

// @desc    Search profiles
// @route   GET /api/search
// @access  Private
export const searchProfiles = async (req, res) => {
  try {
    const {
      type,
      name,
      minAge,
      maxAge,
      city,
      state,
      education,
      occupation,
      religion,
      caste,
      maritalStatus,
      minHeight,
      maxHeight,
      verificationStatus,
      minIncome,
      maxIncome,
      vendorProfilesOnly,
      page = 1,
      limit = 20,
      sortBy = 'newest',
    } = req.query;

    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      userId: { $ne: userId }, // Exclude own profile
      isActive: true,
      isVisible: true, // Only show profiles that are visible in search
      verificationStatus: 'approved', // Only show verified profiles in search
      deletedAt: null, // Exclude deleted profiles
    };

    // Get user's profile and user data to determine opposite type and vendor association
    const userProfile = await Profile.findOne({ userId });
    if (!userProfile) {
      return res.status(200).json({
        success: true,
        profiles: [],
        message: 'Please create your profile first',
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }

    // Get user data to check vendor association
    const userData = await User.findById(userId).select('registeredViaVendor');

    // Handle vendor profiles filter
    if (vendorProfilesOnly === 'true' || vendorProfilesOnly === true) {
      // If user's profile was created by a vendor, show only profiles from that vendor
      if (userProfile.isVendorCreated && userProfile.createdBy) {
        query.createdBy = userProfile.createdBy;
        query.isVendorCreated = true;
      } else if (userData?.registeredViaVendor) {
        // If user registered via vendor, show only profiles created by that vendor
        query.createdBy = userData.registeredViaVendor;
        query.isVendorCreated = true;
      } else {
        // If user doesn't have a vendor association, show all vendor-created profiles
        query.isVendorCreated = true;
      }
    }

    // Set opposite type if not specified
    if (!type) {
      query.type = userProfile.type === 'bride' ? 'groom' : 'bride';
    } else {
      query.type = type;
    }

    // Age filter (only apply if values are provided and not empty)
    if (minAge && minAge.trim() !== '') {
      if (!query['personalInfo.age']) query['personalInfo.age'] = {};
      query['personalInfo.age'].$gte = parseInt(minAge);
    }
    if (maxAge && maxAge.trim() !== '') {
      if (!query['personalInfo.age']) query['personalInfo.age'] = {};
      query['personalInfo.age'].$lte = parseInt(maxAge);
    }

    // Location filters (only apply if values are provided and not empty)
    if (city && city.trim() !== '') {
      query['location.city'] = new RegExp(city, 'i');
    }
    if (state && state.trim() !== '') {
      query['location.state'] = new RegExp(state, 'i');
    }

    // Education filter (only apply if value is provided and not empty)
    if (education && education.trim() !== '') {
      query['education.highestEducation'] = new RegExp(education, 'i');
    }

    // Occupation filter (only apply if value is provided and not empty)
    if (occupation && occupation.trim() !== '') {
      query['career.occupation'] = new RegExp(occupation, 'i');
    }

    // Religion filter (only apply if value is provided and not empty)
    if (religion && religion.trim() !== '') {
      query['religion.religion'] = new RegExp(religion, 'i');
    }

    // Caste filter (only apply if value is provided and not empty)
    if (caste && caste.trim() !== '') {
      query['religion.caste'] = new RegExp(caste, 'i');
    }

    // Name/Keyword search (searches in firstName, lastName, and about)
    if (name && name.trim() !== '') {
      query.$or = [
        { 'personalInfo.firstName': new RegExp(name, 'i') },
        { 'personalInfo.lastName': new RegExp(name, 'i') },
        { 'personalInfo.about': new RegExp(name, 'i') },
      ];
    }

    // Marital status filter
    if (maritalStatus) {
      query['personalInfo.maritalStatus'] = maritalStatus;
    }

    // Verification status filter (if provided, override default)
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    // Income filter (parse income strings like "5-10 Lakhs" or "10+ Lakhs")
    if (minIncome || maxIncome) {
      // This is a simplified implementation - you may need more sophisticated parsing
      // For now, we'll do a regex match on the income string
      if (minIncome) {
        query['career.annualIncome'] = { $gte: minIncome };
      }
      if (maxIncome) {
        if (!query['career.annualIncome']) query['career.annualIncome'] = {};
        query['career.annualIncome'].$lte = maxIncome;
      }
    }

    // Height filter (simplified - you may need to parse height strings)
    // This is a basic implementation
    if (minHeight || maxHeight) {
      query['personalInfo.height'] = {};
      // Note: Height parsing would need more sophisticated logic
    }

    // Sort options
    let sort = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'ageAsc':
        sort = { 'personalInfo.age': 1 };
        break;
      case 'ageDesc':
        sort = { 'personalInfo.age': -1 };
        break;
      case 'location':
        // Sort by state, then city
        sort = { 'location.state': 1, 'location.city': 1 };
        break;
      case 'name':
        sort = { 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Execute query
    const profiles = await Profile.find(query)
      .select('-preferences')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'email phone');

    // Get total count
    const total = await Profile.countDocuments(query);

    // Get interests and favorites for current user
    const interests = await Interest.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    });

    const favorites = await Favorite.find({ userId });

    // Add interest and favorite status to profiles
    const profilesWithStatus = profiles.map((profile) => {
      const profileObj = profile.toObject();
      const interest = interests.find(
        (i) =>
          (i.fromUserId.toString() === userId && i.toUserId.toString() === profile.userId._id.toString()) ||
          (i.toUserId.toString() === userId && i.fromUserId.toString() === profile.userId._id.toString())
      );
      const favorite = favorites.find((f) => f.profileId.toString() === profile._id.toString());

      profileObj.interestStatus = interest ? interest.status : null;
      profileObj.isFavorite = !!favorite;
      return profileObj;
    });

    res.status(200).json({
      success: true,
      profiles: profilesWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

