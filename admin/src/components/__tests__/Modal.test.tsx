import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal Component', () => {
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not render when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
                Content
            </Modal>
        );

        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                Content
            </Modal>
        );

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('calls onClose when clicking close button', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                Content
            </Modal>
        );

        const closeButton = screen.getByLabelText('إغلاق');
        fireEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking overlay if closeOnOverlayClick is true', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" closeOnOverlayClick={true}>
                Content
            </Modal>
        );

        const overlay = screen.getByRole('dialog').parentElement?.firstChild as HTMLElement;
        fireEvent.click(overlay);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders footer when provided', () => {
        render(
            <Modal
                isOpen={true}
                onClose={mockOnClose}
                title="Test Modal"
                footer={<button>Footer Button</button>}
            >
                Content
            </Modal>
        );

        expect(screen.getByText('Footer Button')).toBeInTheDocument();
    });

    it('has proper ARIA attributes', () => {
        render(
            <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
                Content
            </Modal>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
});
