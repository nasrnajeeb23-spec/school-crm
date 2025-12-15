const { errorHandler, AppError, ValidationError } = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    it('should handle AppError correctly', () => {
        const error = new AppError('Test error', 400);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'AppError',
                message: 'Test error'
            }
        });
    });

    it('should handle ValidationError correctly', () => {
        const error = new ValidationError('Validation failed', [
            { field: 'name', message: 'Name is required' }
        ]);

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'ValidationError',
                message: 'Validation failed',
                details: [{ field: 'name', message: 'Name is required' }]
            }
        });
    });

    it('should handle generic errors', () => {
        const error = new Error('Generic error');

        errorHandler(error, req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'Error',
                message: 'Generic error'
            }
        });
    });

    it('should hide error details in production', () => {
        process.env.NODE_ENV = 'production';
        const error = new Error('Sensitive error');

        errorHandler(error, req, res, next);

        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'Error',
                message: 'حدث خطأ في الخادم'
            }
        });

        process.env.NODE_ENV = 'test';
    });
});
