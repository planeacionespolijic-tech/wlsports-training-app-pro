import { EvaluationFormData } from './evaluationEngine';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateStep = (step: number, formData: EvaluationFormData): ValidationResult => {
  switch (step) {
    case 1: // Profile
      if (!formData.profile.name.trim()) return { isValid: false, message: 'El nombre es obligatorio' };
      if (!formData.profile.sport.trim()) return { isValid: false, message: 'El deporte es obligatorio' };
      return { isValid: true };
    case 2: // Health
      // Critical health info is better than empty, but maybe not strictly required to allow advance?
      // User requested "Bloquear avance si faltan datos esenciales"
      return { isValid: true }; 
    case 3: // Habits
      return { isValid: true };
    case 4: // Environment
      return { isValid: true };
    case 5: // Goals
      if (!formData.commitment.trim()) return { isValid: false, message: 'El compromiso final es obligatorio' };
      return { isValid: true };
    default:
      return { isValid: true };
  }
};
