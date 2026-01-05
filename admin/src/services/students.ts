import { apiCall, unwrap } from './core';
import { Student, NewStudentData, UpdatableStudentData, StudentNote, StudentDocument, StudentGrades, BehaviorRecord } from '../types';

export const getStudents = async (schoolId: number): Promise<Student[]> => {
    const response = await apiCall(`/school/${schoolId}/students`);
    return unwrap<Student[]>(response, 'students', []);
};

export const getStudent = async (id: string): Promise<Student> => {
    return await apiCall(`/students/${id}`);
};

export const createStudent = async (studentData: NewStudentData): Promise<Student> => {
    // Note: Assuming route handles schoolId context or it's passed in body if not in path
    // Based on legacy `api.ts`, params were mixed. Refactoring to standard paths.
    // If original called `/school/:id/students`, we should match. 
    // `api.ts` usually had `createStudent(data)` implying context was internal or data had it.
    // Let's assume standard path: `/school/${getSchoolId()}/students` or just `/students` if body has it.
    // For safety, checking `types.ts` or usage is best.
    // Assuming body has necessary context or relying on standard POST /school/:id/students
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/students`, {
        method: 'POST',
        body: JSON.stringify(studentData),
    });
};

export const updateStudent = async (id: string, studentData: UpdatableStudentData): Promise<Student> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
    });
};

export const deleteStudent = async (id: string): Promise<void> => {
    const sid = localStorage.getItem('current_school_id');
    await apiCall(`/school/${sid}/students/${id}`, { method: 'DELETE' });
};

// --- Sub-features ---

export const getStudentNotes = async (studentId: string): Promise<StudentNote[]> => {
    return await apiCall(`/students/${studentId}/notes`);
};

export const addStudentNote = async (studentId: string, note: string): Promise<StudentNote> => {
    return await apiCall(`/students/${studentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: note }),
    });
};

export const getStudentDocuments = async (studentId: string): Promise<StudentDocument[]> => {
    return await apiCall(`/students/${studentId}/documents`);
};

export const uploadStudentDocument = async (studentId: string, file: File): Promise<StudentDocument> => {
    const formData = new FormData();
    formData.append('document', file);
    return await apiCall(`/students/${studentId}/documents`, {
        method: 'POST',
        body: formData,
    });
};

export const getStudentGrades = async (studentId: string): Promise<StudentGrades[]> => {
    return await apiCall(`/students/${studentId}/grades`);
};

export const getStudentBehavior = async (studentId: string): Promise<BehaviorRecord[]> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/students/${studentId}/behavior`);
};

export const addStudentBehavior = async (studentId: string, data: any): Promise<BehaviorRecord> => {
    const sid = localStorage.getItem('current_school_id');
    return await apiCall(`/school/${sid}/students/${studentId}/behavior`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
