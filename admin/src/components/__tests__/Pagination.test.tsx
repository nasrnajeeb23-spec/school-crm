import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../Pagination';

describe('Pagination Component', () => {
    const mockOnPageChange = jest.fn();
    const mockOnItemsPerPageChange = jest.fn();

    const defaultProps = {
        currentPage: 1,
        totalPages: 10,
        totalItems: 100,
        itemsPerPage: 10,
        onPageChange: mockOnPageChange,
        onItemsPerPageChange: mockOnItemsPerPageChange,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders pagination correctly', () => {
        render(<Pagination {...defaultProps} />);

        expect(screen.getByText('عرض')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('displays correct item range', () => {
        render(<Pagination {...defaultProps} />);

        expect(screen.getByText(/عرض/)).toBeInTheDocument();
        expect(screen.getByText(/1/)).toBeInTheDocument();
        expect(screen.getByText(/10/)).toBeInTheDocument();
        expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('calls onPageChange when clicking next button', () => {
        render(<Pagination {...defaultProps} />);

        const nextButton = screen.getByLabelText('الصفحة التالية');
        fireEvent.click(nextButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when clicking previous button', () => {
        render(<Pagination {...defaultProps} currentPage={2} />);

        const prevButton = screen.getByLabelText('الصفحة السابقة');
        fireEvent.click(prevButton);

        expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('disables previous button on first page', () => {
        render(<Pagination {...defaultProps} />);

        const prevButton = screen.getByLabelText('الصفحة السابقة');
        expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
        render(<Pagination {...defaultProps} currentPage={10} />);

        const nextButton = screen.getByLabelText('الصفحة التالية');
        expect(nextButton).toBeDisabled();
    });

    it('calls onItemsPerPageChange when changing items per page', () => {
        render(<Pagination {...defaultProps} />);

        const select = screen.getByLabelText('عرض:');
        fireEvent.change(select, { target: { value: '25' } });

        expect(mockOnItemsPerPageChange).toHaveBeenCalledWith(25);
    });

    it('highlights current page', () => {
        render(<Pagination {...defaultProps} currentPage={5} />);

        const currentPageButton = screen.getByLabelText('الصفحة 5');
        expect(currentPageButton).toHaveClass('bg-indigo-600');
    });
});
