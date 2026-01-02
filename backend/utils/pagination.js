// Pagination helper for backend
const paginate = (query, options = {}) => {
    const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = options;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build order clause
    const order = [[sortBy, sortOrder.toUpperCase()]];

    // Add pagination to query
    query.limit = parseInt(limit);
    query.offset = parseInt(offset);
    query.order = order;

    return query;
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 10;
    const totalPages = Math.ceil(total / itemsPerPage);

    return {
        data,
        pagination: {
            currentPage,
            totalPages,
            totalItems: total,
            itemsPerPage,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1
        }
    };
};

// Pagination middleware
const paginationMiddleware = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Validate
    if (page < 1) {
        return res.status(400).json({
            success: false,
            error: {
                type: 'ValidationError',
                message: 'رقم الصفحة يجب أن يكون أكبر من 0'
            }
        });
    }

    if (limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            error: {
                type: 'ValidationError',
                message: 'عدد العناصر يجب أن يكون بين 1 و 100'
            }
        });
    }

    // Add to request
    req.pagination = {
        page,
        limit,
        sortBy,
        sortOrder,
        offset: (page - 1) * limit
    };

    next();
};

module.exports = {
    paginate,
    buildPaginationResponse,
    paginationMiddleware
};
