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

