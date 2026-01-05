import { apiCall } from './core';
import { Class, NewClassData, ClassRosterUpdate, ScheduleEntry } from '../types';

export const getClasses = async (schoolId: number): Promise<Class[]> => {
    return await apiCall(`/school/${schoolId}/classes`);
};

export const createClass = async (classData: NewClassData): Promise<Class> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/classes`, {
        method: 'POST',
        body: JSON.stringify(classData),
    });
};

export const updateClassRoster = async (data: ClassRosterUpdate): Promise<Class> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/classes/${data.classId}/roster`, {
        method: 'PUT',
        body: JSON.stringify({ studentIds: data.studentIds }),
    });
};

export const deleteClass = async (classId: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/classes/${classId}`, { method: 'DELETE' });
};

export const getClassSchedule = async (classId: string): Promise<ScheduleEntry[]> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/classes/${classId}/schedule`);
};

export const updateClassSchedule = async (classId: string, entries: ScheduleEntry[]): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/classes/${classId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ entries }),
    });
};
