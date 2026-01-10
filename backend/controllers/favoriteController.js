import Favorite from '../models/Favorite.js';
import Profile from '../models/Profile.js';

// @desc    Add to favorites
// @route   POST /api/favorites
// @access  Private
export const addFavorite = async (req, res) => {
  try {
    const { profileId } = req.body;

    if (!profileId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide profileId',
      });
    }

    // Check if profile exists
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Prevent adding own profile to favorites
    if (profile.userId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add your own profile to favorites',
      });
    }

    // Check if profile user is active
    const User = (await import('../models/User.js')).default;
    const profileUser = await User.findById(profile.userId);
    if (!profileUser || !profileUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot favorite an inactive profile',
      });
    }

    // Check if profile is verified
    if (profile.verificationStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot favorite an unverified profile',
      });
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId: req.user.id,
      profileId,
    });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Profile already in favorites',
      });
    }

    const favorite = await Favorite.create({
      userId: req.user.id,
      profileId,
    });

    res.status(201).json({
      success: true,
      favorite,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove from favorites
// @route   DELETE /api/favorites/:profileId
// @access  Private
export const removeFavorite = async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      userId: req.user.id,
      profileId: req.params.profileId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    await favorite.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Removed from favorites',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get favorites
// @route   GET /api/favorites
// @access  Private
export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id })
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          select: 'email phone',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      favorites,
      count: favorites.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update favorite (notes, category)
// @route   PUT /api/favorites/:profileId
// @access  Private
export const updateFavorite = async (req, res) => {
  try {
    const { notes, category } = req.body;

    const favorite = await Favorite.findOne({
      userId: req.user.id,
      profileId: req.params.profileId,
    });

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found',
      });
    }

    if (notes !== undefined) {
      favorite.notes = notes;
    }
    if (category !== undefined) {
      favorite.category = category;
    }

    await favorite.save();

    res.status(200).json({
      success: true,
      favorite,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export favorites
// @route   GET /api/favorites/export
// @access  Private
export const exportFavorites = async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const favorites = await Favorite.find({ userId: req.user.id })
      .populate({
        path: 'profileId',
        populate: {
          path: 'userId',
          select: 'email phone',
        },
      })
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Name,Age,City,State,Category,Notes,Created At\n';
      const csvRows = favorites.map(fav => {
        const profile = fav.profileId;
        const name = `${profile?.personalInfo?.firstName || ''} ${profile?.personalInfo?.lastName || ''}`.trim();
        const age = profile?.personalInfo?.age || '';
        const city = profile?.location?.city || '';
        const state = profile?.location?.state || '';
        const category = fav.category || 'general';
        const notes = (fav.notes || '').replace(/"/g, '""'); // Escape quotes for CSV
        const createdAt = new Date(fav.createdAt).toLocaleDateString();
        return `"${name}","${age}","${city}","${state}","${category}","${notes}","${createdAt}"`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=favorites-${Date.now()}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      // Return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=favorites-${Date.now()}.json`);
      res.json({
        success: true,
        favorites: favorites.map(fav => ({
          profile: {
            name: `${fav.profileId?.personalInfo?.firstName || ''} ${fav.profileId?.personalInfo?.lastName || ''}`.trim(),
            age: fav.profileId?.personalInfo?.age,
            city: fav.profileId?.location?.city,
            state: fav.profileId?.location?.state,
            email: fav.profileId?.userId?.email,
            phone: fav.profileId?.userId?.phone,
          },
          category: fav.category,
          notes: fav.notes,
          createdAt: fav.createdAt,
        })),
        count: favorites.length,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

