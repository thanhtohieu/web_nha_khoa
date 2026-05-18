// ─── Roles ─────────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:        'admin',
  DOCTOR:       'doctor',
  RECEPTIONIST: 'receptionist',
  PATIENT:      'patient',
};

// ─── Default redirect per role after login ──────────────────────────────────
export const ROLE_HOME = {
  [ROLES.ADMIN]:        ROUTES.ADMIN_DASHBOARD,
  [ROLES.DOCTOR]:       ROUTES.DOCTOR_DASHBOARD,
  [ROLES.RECEPTIONIST]: ROUTES.RECEPTIONIST_DASHBOARD,
  [ROLES.PATIENT]:      ROUTES.PATIENT_DASHBOARD,
};
