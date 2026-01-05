import { apiCall } from './core';
import { BusOperator, Route } from '../types';

export const getBusOperators = async (schoolId: number): Promise<BusOperator[]> => {
  return await apiCall(`/transportation/${schoolId}/operators`);
};

export const createBusOperator = async (
  schoolId: number,
  data: { name: string; email: string; phone: string; licenseNumber: string; busPlateNumber: string; busCapacity: number; busModel: string; branchId?: string; stageId?: string; departmentId?: string }
): Promise<BusOperator> => {
  return await apiCall(`/transportation/${schoolId}/operators`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const approveBusOperator = async (operatorId: string): Promise<BusOperator> => {
  return await apiCall(`/transportation/operator/${operatorId}/approve`, { method: 'PUT' });
};

export const rejectBusOperator = async (operatorId: string): Promise<BusOperator> => {
  return await apiCall(`/transportation/operator/${operatorId}/reject`, { method: 'PUT' });
};

export const getBusOperatorInviteLink = async (operatorId: string): Promise<{ activationLink: string }> => {
  return await apiCall(`/transportation/operator/${operatorId}/invite-link`);
};

export const getRoutes = async (schoolId: number): Promise<Route[]> => {
  return await apiCall(`/transportation/${schoolId}/routes`);
};

export const addRoute = async (
  schoolId: number,
  data: Omit<Route, 'id' | 'studentIds'>
): Promise<Route> => {
  return await apiCall(`/transportation/${schoolId}/routes`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRouteStudents = async (
  schoolId: number,
  routeId: string,
  studentIds: string[]
): Promise<Route> => {
  return await apiCall(`/transportation/${schoolId}/routes/${routeId}/students`, {
    method: 'PUT',
    body: JSON.stringify({ studentIds }),
  });
};

export const updateRouteConfig = async (
  schoolId: number,
  routeId: string,
  config: { name?: string; busOperatorId?: string | null; departureTime?: string | null; stops?: { name: string; time?: string; lat?: number; lng?: number }[] }
): Promise<Route> => {
  return await apiCall(`/transportation/${schoolId}/routes/${routeId}/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
};

export const autoAssignRoutes = async (
  schoolId: number,
  options: { mode: 'geo' | 'text'; fillToCapacity?: boolean; skipMissingLocation?: boolean; fallbackToText?: boolean }
): Promise<{ assigned: any[]; skipped: any[]; capacityMap: Record<string, any> }> => {
  return await apiCall(`/transportation/${schoolId}/auto-assign`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
};

export const autoAssignPreview = async (
  schoolId: number,
  options: { mode: 'geo' | 'text'; fillToCapacity?: boolean; skipMissingLocation?: boolean; fallbackToText?: boolean }
): Promise<{ assigned: any[]; skipped: any[]; capacityMap: Record<string, any> }> => {
  return await apiCall(`/transportation/${schoolId}/auto-assign/preview`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
};
