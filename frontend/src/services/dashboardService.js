import apiClient from "./apiClient";

const buildUserSummary = (users = []) => ({
  totalUsers: users.length,
  customerCount: users.filter((user) => !user?.isAdmin).length,
  adminCount: users.filter((user) => user?.isAdmin).length,
  activeUsers: users.filter((user) => Number(user?.totalBookings || 0) > 0).length,
  newToday: 0,
  newWeek: 0,
  newMonth: 0
});

const fetchAdminUsersResponse = async (page = 1, limit = 200) => {
  const response = await apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
  const data = response.data;

  if (Array.isArray(data)) {
    return {
      users: data,
      total: data.length,
      page,
      pages: 1,
      summary: buildUserSummary(data)
    };
  }

  return {
    users: data.users || [],
    total: data.total || 0,
    page: data.page || page,
    pages: data.pages || 1,
    summary: data.summary || null
  };
};

export const getDashboardData = async () => {
  const response = await apiClient.get('/admin/dashboard');
  return response.data;
};

export const getAllUsers = async (page = 1, limit = 200) => {
  const response = await fetchAdminUsersResponse(page, limit);
  return response.users;
};

export const getAllUsersResponse = fetchAdminUsersResponse;

export const getAllBookings = async (page = 1, limit = 200) => {
  const response = await apiClient.get(`/admin/bookings?page=${page}&limit=${limit}`);
  // Support both old array response and new paginated response
  const data = response.data;
  return Array.isArray(data) ? data : (data.bookings || []);
};

export const deleteUser = async (userId) => {
  const response = await apiClient.delete(`/admin/users/${userId}`);
  return response.data;
};

export const deleteBooking = async (bookingId) => {
  const response = await apiClient.delete(`/admin/bookings/${bookingId}`);
  return response.data;
};

export const formatCurrency = (amount) => {
  if (!amount || amount === 0) return 'Rs.0';

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (numAmount >= 10000000) {
    return `Rs.${(numAmount / 10000000).toFixed(1)}Cr`;
  }
  if (numAmount >= 100000) {
    return `Rs.${(numAmount / 100000).toFixed(1)}L`;
  }
  if (numAmount >= 1000) {
    return `Rs.${(numAmount / 1000).toFixed(1)}K`;
  }
  return `Rs.${numAmount.toLocaleString('en-IN')}`;
};

export const formatDate = (date) => {
  if (!date) return 'N/A';

  const dateObj = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - dateObj);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
    }
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

export const getActivityIcon = (type) => {
  switch (type) {
    case 'booking':
      return 'booking';
    case 'user':
      return 'users';
    case 'payment':
      return 'payment';
    default:
      return 'activity';
  }
};

const dashboardService = {
  getDashboardData,
  getAllUsers,
  getAllUsersResponse,
  getAllBookings,
  deleteUser,
  deleteBooking,
  formatCurrency,
  formatDate,
  getActivityIcon,
};

export default dashboardService;
