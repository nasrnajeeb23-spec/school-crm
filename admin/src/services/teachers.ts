import { apiCall, unwrap } from './core';
import { Teacher, NewTeacherData, UpdatableTeacherData, ScheduleEntry } from '../types';

export const getTeachers = async (schoolId: number): Promise<Teacher[]> => {
    const response = await apiCall(`/school/${schoolId}/teachers`);
    return unwrap<Teacher[]>(response, 'teachers', []);
};

export const getTeacher = async (id: string): Promise<Teacher> => {
    const sid = localStorage.getItem('current_school_id');
    // Note: Backend route might be /school/:sid/teachers/:tid or generic /teachers/:tid
    // Using context-aware route is safer per our backend refactor
    return await apiCall(`/school/${sid}/teachers/${id}`);
};

export const createTeacher = async (teacherData: NewTeacherData): Promise<Teacher> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/teachers`, {
        method: 'POST',
        body: JSON.stringify(teacherData),
    });
};

export const updateTeacher = async (id: string, teacherData: UpdatableTeacherData): Promise<Teacher> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(teacherData),
    });
};

export const deleteTeacher = async (id: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/teachers/${id}`, { method: 'DELETE' });
};

export const getTeacherSchedule = async (teacherId: string): Promise<ScheduleEntry[]> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/teachers/${teacherId}/schedule`);
};

export const assignTeacherSalaryStructure = async (teacherId: string, salaryStructureId: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/teachers/${teacherId}/salary-structure`, {
        method: 'PUT',
        body: JSON.stringify({ salaryStructureId }),
    });
};
