import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Breadcrumbs from '../Breadcrumbs';

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Breadcrumbs Component', () => {
    it('renders breadcrumbs with custom items', () => {
        const items = [
            { label: 'الرئيسية', path: '/' },
            { label: 'المدارس', path: '/schools' },
            { label: 'إدارة المدرسة' },
        ];

        renderWithRouter(<Breadcrumbs items={items} />);

        expect(screen.getByText('الرئيسية')).toBeInTheDocument();
        expect(screen.getByText('المدارس')).toBeInTheDocument();
        expect(screen.getByText('إدارة المدرسة')).toBeInTheDocument();
    });

    it('renders links for non-last items', () => {
        const items = [
            { label: 'الرئيسية', path: '/' },
            { label: 'المدارس', path: '/schools' },
            { label: 'إدارة المدرسة' },
        ];

        renderWithRouter(<Breadcrumbs items={items} />);

        const homeLink = screen.getByText('الرئيسية').closest('a');
        const schoolsLink = screen.getByText('المدارس').closest('a');
        const currentPage = screen.getByText('إدارة المدرسة').closest('span');

        expect(homeLink).toHaveAttribute('href', '/');
        expect(schoolsLink).toHaveAttribute('href', '/schools');
        expect(currentPage).not.toHaveAttribute('href');
    });

    it('does not render when only one item', () => {
        const items = [{ label: 'الرئيسية', path: '/' }];

        const { container } = renderWithRouter(<Breadcrumbs items={items} />);

        expect(container.firstChild).toBeNull();
    });

    it('has proper aria-label', () => {
        const items = [
            { label: 'الرئيسية', path: '/' },
            { label: 'المدارس' },
        ];

        renderWithRouter(<Breadcrumbs items={items} />);

        const nav = screen.getByLabelText('Breadcrumb');
        expect(nav).toBeInTheDocument();
    });
});
