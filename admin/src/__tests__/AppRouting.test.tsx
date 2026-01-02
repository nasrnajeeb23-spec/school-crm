import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { UserRole } from '../types';

const mockUseAppContext = jest.fn();

jest.mock('../contexts/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

jest.mock('../components/ToastContainer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

jest.mock('../pages/LoginPage', () => ({
  __esModule: true,
  default: () => <div>LOGIN_PAGE</div>,
}));

jest.mock('../layouts/SuperAdminLayout', () => {
  const { Outlet } = jest.requireActual('react-router-dom') as typeof import('react-router-dom');
  return {
    __esModule: true,
    default: () => (
      <div>
        <Outlet />
      </div>
    ),
  };
});

jest.mock('../pages/Dashboard', () => ({
  __esModule: true,
  default: () => <div>SUPERADMIN_DASHBOARD</div>,
}));

jest.mock('../layouts/TeacherLayout', () => {
  const { Outlet } = jest.requireActual('react-router-dom') as typeof import('react-router-dom');
  return {
    __esModule: true,
    default: () => (
      <div>
        <Outlet />
      </div>
    ),
  };
});

jest.mock('../pages/TeacherDashboard', () => ({
  __esModule: true,
  default: () => <div>TEACHER_DASHBOARD</div>,
}));

jest.mock('../layouts/ParentLayout', () => {
  const { Outlet } = jest.requireActual('react-router-dom') as typeof import('react-router-dom');
  return {
    __esModule: true,
    default: () => (
      <div>
        <Outlet />
      </div>
    ),
  };
});

jest.mock('../pages/ParentDashboard', () => ({
  __esModule: true,
  default: () => <div>PARENT_DASHBOARD</div>,
}));

jest.mock('../layouts/SchoolAdminLayout', () => ({
  __esModule: true,
  default: () => <div>SCHOOL_ADMIN_LAYOUT</div>,
}));

describe('App routing smoke tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows session hydration loader while hydrating', () => {
    mockUseAppContext.mockReturnValue({
      currentUser: null,
      hydrating: true,
    });

    render(
      <MemoryRouter initialEntries={['/superadmin/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('جاري تحميل الجلسة...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    mockUseAppContext.mockReturnValue({
      currentUser: null,
      hydrating: false,
    });

    render(
      <MemoryRouter initialEntries={['/superadmin/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('LOGIN_PAGE')).toBeInTheDocument();
  });

  it('allows superadmin roles to access superadmin routes', async () => {
    mockUseAppContext.mockReturnValue({
      currentUser: {
        id: 'u1',
        name: 'SA',
        email: 'sa@example.com',
        role: UserRole.SuperAdminFinancial,
        schoolId: null,
      },
      hydrating: false,
    });

    render(
      <MemoryRouter initialEntries={['/superadmin/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('SUPERADMIN_DASHBOARD')).toBeInTheDocument();
  });

  it('redirects wrong-role users to their home area', async () => {
    mockUseAppContext.mockReturnValue({
      currentUser: {
        id: 'u2',
        name: 'Teacher',
        email: 't@example.com',
        role: UserRole.Teacher,
        schoolId: 1,
      },
      hydrating: false,
    });

    render(
      <MemoryRouter initialEntries={['/superadmin/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('TEACHER_DASHBOARD')).toBeInTheDocument();
  });

  it('routes school admin users into /school area', async () => {
    mockUseAppContext.mockReturnValue({
      currentUser: {
        id: 'u3',
        name: 'School Admin',
        email: 'a@example.com',
        role: UserRole.SchoolAdmin,
        schoolId: 10,
      },
      hydrating: false,
    });

    render(
      <MemoryRouter initialEntries={['/school']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('SCHOOL_ADMIN_LAYOUT')).toBeInTheDocument();
  });

  it('routes parent users into /parent area', async () => {
    mockUseAppContext.mockReturnValue({
      currentUser: {
        id: 'u4',
        name: 'Parent',
        email: 'p@example.com',
        role: UserRole.Parent,
        schoolId: 10,
      },
      hydrating: false,
    });

    render(
      <MemoryRouter initialEntries={['/parent']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('PARENT_DASHBOARD')).toBeInTheDocument();
  });
});
