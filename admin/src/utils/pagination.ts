// API helper for pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

// Build query string for pagination
export const buildPaginationQuery = (params: PaginationParams): string => {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
};

// Parse pagination response
export const parsePaginationResponse = <T>(response: any): PaginatedResponse<T> => {
    return {
        data: response.data || response.items || response,
        pagination: {
            currentPage: response.currentPage || response.page || 1,
            totalPages: response.totalPages || Math.ceil((response.total || 0) / (response.limit || 10)),
            totalItems: response.total || response.totalItems || 0,
            itemsPerPage: response.limit || response.itemsPerPage || 10,
            hasNextPage: response.hasNextPage || false,
            hasPrevPage: response.hasPrevPage || false
        }
    };
};

export default {
    buildPaginationQuery,
    parsePaginationResponse
};
