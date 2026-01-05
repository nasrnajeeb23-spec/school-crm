import { apiCall, getApiBase, getAuthToken } from './core';

export const exportData = async (type: 'students' | 'teachers' | 'grades' | 'finance'): Promise<Blob> => {
    const sid = localStorage.getItem('current_school_id');
    const response = await apiCall(`/school/${sid}/reports/export/${type}`, {
        headers: { 'Accept': 'text/csv' } // Hint for CSV
    });
    // Assuming apiCall returns JSON by default but we need a Blob. 
    // If apiCall parses JSON automatically, we might need a special flag or raw fetch.
    // Given `core.ts` implementation: it does `response.json()` unless error.
    // We should probably add `raw: true` option to `apiCall` or just fetch here if `apiCall` doesn't support it.
    // Let's rely on a direct fetch or assume apiCall handles non-JSON if content-type is CSV?
    // The current `apiCall` blindly calls `response.json()`.
    // Correct Fix for Blob handling:

    // Quick workaround locally since `apiCall` is in our control:
    // If we can't change `apiCall` easily without breaking others, use a direct fetch with the same logic as `apiCall` manually.
    const res = await fetch(`${getApiBase()}/school/${sid}/reports/export/${type}`, {
        headers: {
            Authorization: `Bearer ${getAuthToken()}`
        }
    });
    return await res.blob();
};
