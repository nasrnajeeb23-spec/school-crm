import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../SearchBar';

jest.useFakeTimers();

describe('SearchBar Component', () => {
    const mockOnSearch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders search input', () => {
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('بحث...');
        expect(input).toBeInTheDocument();
    });

    it('calls onSearch after debounce delay', () => {
        render(<SearchBar onSearch={mockOnSearch} debounceMs={300} />);

        const input = screen.getByPlaceholderText('بحث...');
        fireEvent.change(input, { target: { value: 'test' } });

        expect(mockOnSearch).not.toHaveBeenCalled();

        jest.advanceTimersByTime(300);

        expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    it('shows clear button when input has value', () => {
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('بحث...');
        fireEvent.change(input, { target: { value: 'test' } });

        const clearButton = screen.getByLabelText('مسح البحث');
        expect(clearButton).toBeInTheDocument();
    });

    it('clears input when clicking clear button', () => {
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByPlaceholderText('بحث...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'test' } });

        const clearButton = screen.getByLabelText('مسح البحث');
        fireEvent.click(clearButton);

        expect(input.value).toBe('');
        expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('has proper aria-label', () => {
        render(<SearchBar onSearch={mockOnSearch} />);

        const input = screen.getByLabelText('بحث');
        expect(input).toBeInTheDocument();
    });
});
