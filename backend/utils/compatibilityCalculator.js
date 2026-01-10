import Profile from '../models/Profile.js';

/**
 * Calculate compatibility score between two profiles
 * Returns a percentage (0-100)
 */
export const calculateCompatibility = async (profile1Id, profile2Id) => {
  try {
    const profile1 = await Profile.findById(profile1Id);
    const profile2 = await Profile.findById(profile2Id);

    if (!profile1 || !profile2) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    // Age compatibility (20 points)
    maxScore += 20;
    if (profile1.personalInfo?.age && profile2.personalInfo?.age) {
      const ageDiff = Math.abs(profile1.personalInfo.age - profile2.personalInfo.age);
      if (ageDiff <= 2) score += 20;
      else if (ageDiff <= 5) score += 15;
      else if (ageDiff <= 10) score += 10;
      else if (ageDiff <= 15) score += 5;
    }

    // Location compatibility (15 points)
    maxScore += 15;
    if (profile1.location?.city && profile2.location?.city) {
      if (profile1.location.city === profile2.location.city) score += 15;
      else if (profile1.location.state === profile2.location.state) score += 10;
      else if (profile1.location.country === profile2.location.country) score += 5;
    }

    // Religion compatibility (20 points)
    maxScore += 20;
    if (profile1.religion?.religion && profile2.religion?.religion) {
      if (profile1.religion.religion === profile2.religion.religion) {
        score += 15;
        // Caste match adds more points
        if (profile1.religion.caste && profile2.religion.caste) {
          if (profile1.religion.caste === profile2.religion.caste) score += 5;
        }
      }
    }

    // Education compatibility (15 points)
    maxScore += 15;
    if (profile1.education?.highestEducation && profile2.education?.highestEducation) {
      const eduLevels = ['High School', 'Diploma', 'Bachelor', 'Master', 'PhD'];
      const level1 = eduLevels.indexOf(profile1.education.highestEducation);
      const level2 = eduLevels.indexOf(profile2.education.highestEducation);
      if (level1 !== -1 && level2 !== -1) {
        const diff = Math.abs(level1 - level2);
        if (diff === 0) score += 15;
        else if (diff === 1) score += 10;
        else if (diff === 2) score += 5;
      }
    }

    // Lifestyle compatibility (15 points)
    maxScore += 15;
    let lifestyleMatches = 0;
    if (profile1.personalInfo?.eatingHabits && profile2.personalInfo?.eatingHabits) {
      if (profile1.personalInfo.eatingHabits === profile2.personalInfo.eatingHabits) lifestyleMatches++;
    }
    if (profile1.personalInfo?.drinkingHabits && profile2.personalInfo?.drinkingHabits) {
      if (profile1.personalInfo.drinkingHabits === profile2.personalInfo.drinkingHabits) lifestyleMatches++;
    }
    if (profile1.personalInfo?.smokingHabits && profile2.personalInfo?.smokingHabits) {
      if (profile1.personalInfo.smokingHabits === profile2.personalInfo.smokingHabits) lifestyleMatches++;
    }
    score += (lifestyleMatches / 3) * 15;

    // Family compatibility (10 points)
    maxScore += 10;
    if (profile1.familyInfo?.familyType && profile2.familyInfo?.familyType) {
      if (profile1.familyInfo.familyType === profile2.familyInfo.familyType) score += 10;
      else score += 5;
    }

    // Preferences match (5 points)
    maxScore += 5;
    if (profile1.preferences && profile2.preferences) {
      // Check age range preferences
      if (profile1.preferences.ageRange && profile2.personalInfo?.age) {
        const { min, max } = profile1.preferences.ageRange;
        if (min && max && profile2.personalInfo.age >= min && profile2.personalInfo.age <= max) {
          score += 2.5;
        }
      }
      if (profile2.preferences.ageRange && profile1.personalInfo?.age) {
        const { min, max } = profile2.preferences.ageRange;
        if (min && max && profile1.personalInfo.age >= min && profile1.personalInfo.age <= max) {
          score += 2.5;
        }
      }
    }

    const percentage = Math.round((score / maxScore) * 100);
    return Math.min(100, Math.max(0, percentage));
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    return 0;
  }
};

/**
 * Get mutual interests/common preferences between two profiles
 */
export const getMutualInterests = (profile1, profile2) => {
  const mutual = [];

  // Location
  if (profile1.location?.city === profile2.location?.city) {
    mutual.push({ type: 'location', value: `Both from ${profile1.location.city}` });
  } else if (profile1.location?.state === profile2.location?.state) {
    mutual.push({ type: 'location', value: `Both from ${profile1.location.state}` });
  }

  // Education
  if (profile1.education?.highestEducation === profile2.education?.highestEducation) {
    mutual.push({ type: 'education', value: profile1.education.highestEducation });
  }

  // Religion
  if (profile1.religion?.religion === profile2.religion?.religion) {
    mutual.push({ type: 'religion', value: profile1.religion.religion });
  }

  // Caste
  if (profile1.religion?.caste === profile2.religion?.caste && profile1.religion?.caste) {
    mutual.push({ type: 'caste', value: profile1.religion.caste });
  }

  // Lifestyle
  if (profile1.personalInfo?.eatingHabits === profile2.personalInfo?.eatingHabits) {
    mutual.push({ type: 'lifestyle', value: `Both ${profile1.personalInfo.eatingHabits}` });
  }

  // Family type
  if (profile1.familyInfo?.familyType === profile2.familyInfo?.familyType) {
    mutual.push({ type: 'family', value: profile1.familyInfo.familyType });
  }

  return mutual;
};

