import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  ROLE_PERMISSIONS,
  type StaffSession,
} from '../state/authSession';
import { roleAllowed, canEditFieldByRole } from '../../server/auth.js';

describe('Authentication and Permissions', () => {
  describe('hasPermission', () => {
    it('should return false when session is null', () => {
      expect(hasPermission(null, 'dashboard:view')).toBe(false);
    });

    it('should return true for admin with any permission', () => {
      const adminSession: StaffSession = {
        mode: 'authenticated',
        user: {
          user_id: 'admin1',
          hospital_id: 'H1',
          role: 'admin',
          username: 'admin',
          display_name: 'Admin User',
          email: 'admin@example.com',
        },
        hospital: { hospital_id: 'H1', name: 'Hospital 1' },
        startedAt: new Date().toISOString(),
      };

      expect(hasPermission(adminSession, 'dashboard:view')).toBe(true);
      expect(hasPermission(adminSession, 'upload:vcf')).toBe(true);
      expect(hasPermission(adminSession, 'medication:edit')).toBe(true);
      expect(hasPermission(adminSession, 'ai:override')).toBe(true);
    });

    it('should respect doctor permissions', () => {
      const doctorSession: StaffSession = {
        mode: 'authenticated',
        user: {
          user_id: 'doc1',
          hospital_id: 'H1',
          role: 'doctor',
          username: 'doctor1',
          display_name: 'Dr. Smith',
          email: 'smith@example.com',
        },
        hospital: { hospital_id: 'H1', name: 'Hospital 1' },
        startedAt: new Date().toISOString(),
      };

      expect(hasPermission(doctorSession, 'dashboard:view')).toBe(true);
      expect(hasPermission(doctorSession, 'upload:vcf')).toBe(true);
      expect(hasPermission(doctorSession, 'medication:edit')).toBe(true);
      expect(hasPermission(doctorSession, 'prescription:edit')).toBe(true);
      expect(hasPermission(doctorSession, 'vitals:edit')).toBe(false);
      expect(hasPermission(doctorSession, 'lab:edit')).toBe(false);
    });

    it('should respect nurse permissions', () => {
      const nurseSession: StaffSession = {
        mode: 'authenticated',
        user: {
          user_id: 'nurse1',
          hospital_id: 'H1',
          role: 'nurse',
          username: 'nurse1',
          display_name: 'Nurse Johnson',
          email: 'nurse@example.com',
        },
        hospital: { hospital_id: 'H1', name: 'Hospital 1' },
        startedAt: new Date().toISOString(),
      };

      expect(hasPermission(nurseSession, 'dashboard:view')).toBe(true);
      expect(hasPermission(nurseSession, 'vitals:edit')).toBe(true);
      expect(hasPermission(nurseSession, 'notes:edit')).toBe(true);
      expect(hasPermission(nurseSession, 'upload:vcf')).toBe(false);
      expect(hasPermission(nurseSession, 'medication:edit')).toBe(false);
      expect(hasPermission(nurseSession, 'ai:override')).toBe(false);
    });

    it('should respect lab_technician permissions', () => {
      const labSession: StaffSession = {
        mode: 'authenticated',
        user: {
          user_id: 'lab1',
          hospital_id: 'H1',
          role: 'lab_technician',
          username: 'lab_tech',
          display_name: 'Lab Tech',
          email: 'lab@example.com',
        },
        hospital: { hospital_id: 'H1', name: 'Hospital 1' },
        startedAt: new Date().toISOString(),
      };

      expect(hasPermission(labSession, 'dashboard:view')).toBe(true);
      expect(hasPermission(labSession, 'lab:upload')).toBe(true);
      expect(hasPermission(labSession, 'lab:edit')).toBe(true);
      expect(hasPermission(labSession, 'reports:view')).toBe(true);
      expect(hasPermission(labSession, 'medication:edit')).toBe(false);
      expect(hasPermission(labSession, 'upload:vcf')).toBe(false);
    });
  });

  describe('Server Authorization Helpers (auth.js)', () => {
    it('should grant admin explicit access and reject role spoofing headers', () => {
      expect(roleAllowed('admin', ['doctor'])).toBe(true);
      expect(roleAllowed('doctor', ['admin'])).toBe(false);
      expect(roleAllowed('nurse', ['admin'])).toBe(false);
      expect(roleAllowed('demo', ['doctor', 'admin'])).toBe(false);
    });

    it('should keep distinct permissions for doctor, nurse, and lab_technician', () => {
      expect(canEditFieldByRole('doctor', 'medication_dosage')).toBe(true);
      expect(canEditFieldByRole('doctor', 'vitals_temperature')).toBe(false);
      expect(canEditFieldByRole('doctor', 'labs_wbc')).toBe(false);

      expect(canEditFieldByRole('nurse', 'vitals_temperature')).toBe(true);
      expect(canEditFieldByRole('nurse', 'medication_dosage')).toBe(false);

      expect(canEditFieldByRole('lab_technician', 'labs_wbc')).toBe(true);
      expect(canEditFieldByRole('lab_technician', 'vitals_temperature')).toBe(false);
    });
  });

  describe('Role Permissions Matrix', () => {
    it('should define permissions for admin role', () => {
      const adminPerms = ROLE_PERMISSIONS.admin;
      expect(adminPerms).toContain('dashboard:view');
      expect(adminPerms).toContain('upload:vcf');
      expect(adminPerms).toContain('ai:override');
      expect(adminPerms.length).toBeGreaterThan(0);
    });

    it('should define permissions for doctor role', () => {
      const doctorPerms = ROLE_PERMISSIONS.doctor;
      expect(doctorPerms).toContain('upload:vcf');
      expect(doctorPerms).toContain('prescription:edit');
      expect(doctorPerms).not.toContain('vitals:edit');
    });

    it('should define permissions for nurse role', () => {
      const nursePerms = ROLE_PERMISSIONS.nurse;
      expect(nursePerms).toContain('vitals:edit');
      expect(nursePerms).not.toContain('upload:vcf');
      expect(nursePerms).not.toContain('medication:edit');
    });

    it('should define permissions for lab_technician role', () => {
      const labPerms = ROLE_PERMISSIONS.lab_technician;
      expect(labPerms).toContain('lab:upload');
      expect(labPerms).toContain('lab:edit');
      expect(labPerms).not.toContain('medication:edit');
    });
  });
});
