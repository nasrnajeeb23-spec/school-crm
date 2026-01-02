import { User, School, ParentRequest } from './src/types';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = ((process.env as any).EXPO_PUBLIC_API_BASE_URL as string) || 'https://school-crschool-crm-backendm.onrender.com/api';

let memoryToken: string | null = null;

async function getToken() {
  try {
    const t = await SecureStore.getItemAsync('auth_token');
    return t || memoryToken;
  } catch {
    return memoryToken;
  }
}

async function setToken(token: string) {
  memoryToken = token;
  try {
    await SecureStore.setItemAsync('auth_token', token);
  } catch {}
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (email: string, password: string, _schoolId: number): Promise<User | null> => {
  try {
    const resp = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.token) await setToken(data.token);
    return data?.user || null;
  } catch {
    return null;
  }
};

export const logout = async () => {
  memoryToken = null;
  try { await SecureStore.deleteItemAsync('auth_token'); } catch {}
};

export const getSchools = async (): Promise<School[]> => {
  const urls = [
    `${API_BASE_URL}/schools`,
    `${API_BASE_URL}/schools/public`,
    `${API_BASE_URL}/public/schools`,
    `${API_BASE_URL.replace(/\/api\/?$/, '')}/schools`,
    `${API_BASE_URL.replace(/\/api\/?$/, '')}/public/schools`
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) return data.map(({ id, name }: any) => ({ id, name }));
      }
    } catch {}
  }
  return [];
};

export const getParentDashboardData = async (parentId: string) => {
  try {
    const headers = await authHeaders();
    const resp = await fetch(`${API_BASE_URL}/parent/${parentId}/dashboard`, { headers });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
};

export const getStudentAndScheduleByParentId = async (parentId: string) => {
  const data = await getParentDashboardData(parentId);
  if (!data) return { student: null, schedule: [] };
  return { student: data.student, schedule: data.schedule || [] };
};

export const getParentRequests = async (_parentId: string): Promise<ParentRequest[]> => {
  return [];
};

export const submitParentRequest = async (_parentId: string, _requestData: Omit<ParentRequest, 'id' | 'submissionDate' | 'status'>): Promise<ParentRequest> => {
  throw new Error('Not implemented');
};

export const getParentTransportationDetails = async (parentId: string) => {
  try {
    const headers = await authHeaders();
    const resp = await fetch(`${API_BASE_URL}/transportation/parent/${parentId}`, { headers });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
};

export const getStudentAssignments = async (_studentId: string) => {
  return [];
};

export const getSubmissionForAssignment = async (_studentId: string, _assignmentId: string) => {
  return { id: '', assignmentId: '', studentId: '', studentName: '', submissionDate: null, status: 'لم يسلم' as any };
};

export const submitAssignment = async (_submissionId: string) => {
  throw new Error('Not implemented');
};

// Messaging
export const getConversations = async () => {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/messaging/conversations`, { headers });
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
};

export const getMessages = async (conversationId: string) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/messaging/conversations/${conversationId}/messages`, { headers });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
};

export const sendMessage = async (conversationId: string, payload: { content: string; senderId: string }) => {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/messaging/send`, {
    method: 'POST',
    headers: { ...(headers as any), 'Content-Type': 'application/json' } as any,
    body: JSON.stringify({ conversationId, text: payload.content }),
  });
  if (!res.ok) throw new Error('Failed to send message');
  const data = await res.json();
  return data.data || data;
};
