/**
 * Check if profile has all mandatory fields completed
 * Mandatory fields: firstName, lastName, dateOfBirth, city, state, religion, caste, and minimum 3 photos
 */
export const isProfileComplete = (profile) => {
  if (!profile) return false;

  const personalInfo = profile.personalInfo || {};
  const location = profile.location || {};
  const religion = profile.religion || {};

  // Check all mandatory fields
  const hasFirstName = personalInfo.firstName && personalInfo.firstName.trim() !== '';
  const hasLastName = personalInfo.lastName && personalInfo.lastName.trim() !== '';
  const hasDateOfBirth = personalInfo.dateOfBirth;
  const hasCity = location.city && location.city.trim() !== '';
  const hasState = location.state && location.state.trim() !== '';
  const hasReligion = religion.religion && religion.religion.trim() !== '';
  const hasCaste = religion.caste && religion.caste.trim() !== '';
  
  // Check minimum 3 photos
  const hasMinimumPhotos = profile.photos && profile.photos.length >= 3;

  return hasFirstName && hasLastName && hasDateOfBirth && hasCity && hasState && hasReligion && hasCaste && hasMinimumPhotos;
};

