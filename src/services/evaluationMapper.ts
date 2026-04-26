import { EvaluationFormData } from './evaluationEngine';

export const mapLegacyData = (
  currentFormData: EvaluationFormData,
  userDoc: any,
  anamnesisDoc: any
): EvaluationFormData => {
  let mergedData = { ...currentFormData };

  if (userDoc?.initialEvaluation) {
    const ev = userDoc.initialEvaluation;
    mergedData = {
      ...mergedData,
      profile: { ...mergedData.profile, ...(ev.profile || {}) },
      health: { ...mergedData.health, ...(ev.health || {}) },
      habits: { ...mergedData.habits, ...(ev.habits || {}) },
      environment: { ...mergedData.environment, ...(ev.environment || {}) },
      goals: { ...mergedData.goals, ...(ev.goals || {}) },
      commitment: ev.commitment || mergedData.commitment
    };
  }

  // Pre-fill profile name if empty
  if (!mergedData.profile.name && userDoc?.displayName) {
    mergedData.profile.name = userDoc.displayName;
  }

  // Map anamnesis data (legacy fallback)
  if (anamnesisDoc) {
    mergedData.health.medicalHistory = anamnesisDoc.medicalHistory || mergedData.health.medicalHistory;
    mergedData.health.injuries = anamnesisDoc.injuries || mergedData.health.injuries;
    mergedData.health.medication = anamnesisDoc.medications || mergedData.health.medication;
    mergedData.habits.lifestyle = anamnesisDoc.habits || mergedData.habits.lifestyle;
    mergedData.goals.longTermGoals = anamnesisDoc.goals || mergedData.goals.longTermGoals;
  }

  return mergedData;
};
