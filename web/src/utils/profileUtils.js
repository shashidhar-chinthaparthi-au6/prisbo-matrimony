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

/**
 * Calculate profile completion percentage
 * Returns a number between 0 and 100
 */
export const getProfileCompletionPercentage = (profile) => {
  if (!profile) return 0;

  const fields = [
    // Personal Info (30%)
    { check: () => profile.personalInfo?.firstName?.trim(), weight: 5 },
    { check: () => profile.personalInfo?.lastName?.trim(), weight: 5 },
    { check: () => profile.personalInfo?.dateOfBirth, weight: 5 },
    { check: () => profile.personalInfo?.age, weight: 2 },
    { check: () => profile.personalInfo?.height, weight: 2 },
    { check: () => profile.personalInfo?.maritalStatus, weight: 3 },
    { check: () => profile.personalInfo?.eatingHabits, weight: 2 },
    { check: () => profile.personalInfo?.drinkingHabits, weight: 2 },
    { check: () => profile.personalInfo?.smokingHabits, weight: 2 },
    { check: () => profile.personalInfo?.about, weight: 2 },
    
    // Location (10%)
    { check: () => profile.location?.city?.trim(), weight: 3 },
    { check: () => profile.location?.state?.trim(), weight: 3 },
    { check: () => profile.location?.country?.trim(), weight: 2 },
    { check: () => profile.location?.pincode?.trim(), weight: 2 },
    
    // Religion (10%)
    { check: () => profile.religion?.religion?.trim(), weight: 4 },
    { check: () => profile.religion?.caste?.trim(), weight: 3 },
    { check: () => profile.religion?.subCaste?.trim(), weight: 1 },
    { check: () => profile.religion?.gothra?.trim(), weight: 1 },
    { check: () => profile.religion?.star?.trim(), weight: 1 },
    
    // Education (10%)
    { check: () => profile.education?.highestEducation?.trim(), weight: 5 },
    { check: () => profile.education?.college?.trim(), weight: 3 },
    { check: () => profile.education?.degree?.trim(), weight: 2 },
    
    // Career (10%)
    { check: () => profile.career?.occupation?.trim(), weight: 5 },
    { check: () => profile.career?.company?.trim(), weight: 3 },
    { check: () => profile.career?.annualIncome?.trim(), weight: 2 },
    
    // Family (10%)
    { check: () => profile.familyInfo?.familyType, weight: 3 },
    { check: () => profile.familyInfo?.familyStatus, weight: 3 },
    { check: () => profile.familyInfo?.fatherOccupation, weight: 2 },
    { check: () => profile.familyInfo?.motherOccupation, weight: 2 },
    
    // Photos (20%)
    { check: () => profile.photos?.length >= 1, weight: 5 },
    { check: () => profile.photos?.length >= 3, weight: 10 },
    { check: () => profile.photos?.length >= 5, weight: 5 },
  ];

  const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
  const completedWeight = fields.reduce((sum, field) => {
    const value = field.check();
    return sum + (value ? field.weight : 0);
  }, 0);

  return Math.round((completedWeight / totalWeight) * 100);
};

