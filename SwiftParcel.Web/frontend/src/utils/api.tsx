import axios from "axios";
import { getUserIdFromStorage, getUserInfo, saveUserInfo } from "./storage";


const API_BASE_URL = 'http://localhost:6001';


const api = axios.create({
  baseURL: "http://localhost:5292",
  withCredentials: true,
});

// api.interceptors.response.use(
//   response => response,
//   error => {
//     if (axios.isAxiosError(error) && error.response?.status === 401) {
//       //// saveUserInfo(null);
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

const getAuthHeader = () => {
  const userInfo = getUserInfo();
  if (!userInfo || !userInfo.accessToken) {
    console.warn('No user token found. Redirecting to login.');
    window.location.href = '/login';
    return null;
  }
  console.log({Authorization: `Bearer ${userInfo.accessToken}`})
  return { Authorization: `${userInfo.accessToken}` };
};

const defaultPageLimit = 10;

export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/identity/sign-in', { email, password });
    const { accessToken, refreshToken, role, expires } = response.data;

    saveUserInfo({ token: accessToken, refreshToken, role, expires }); 
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error during login:', error.response?.data || error.message);
    } else {
      console.error('Error during login:', error);
    }
    throw error;
  }
};

export const register = async (
  username: string,
  password: string,
  email: string
) => {
  try {
    const response = await api.post(`/identity/sign-up`, {
      username,
      password,
      email,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error during registration (Axios error):', error.response?.data || error.message);
    } else {
      console.error('Error during registration:', error);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    const headers = getAuthHeader();
    await api.get('/identity/logout', { headers });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    saveUserInfo(null);
    window.location.href = '/login';
  }
};

export const getProfile = async () => {
  try {
    const headers = getAuthHeader();
    const userId = getUserIdFromStorage(); 
    if (!userId) {
      throw new Error('User ID not found');
    }

    const response = await api.get(`identity/users/${userId}`, { headers });
    console.log("identity/users/${userId}: ", response.data)
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching profile:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        saveUserInfo(null);
        window.location.href = '/login';
      }
    } else {
      console.error('Error fetching profile:', error);
    }
    throw error;
  }
};


export const getUsers = async (page = 1, perPage = defaultPageLimit) => {
  try {
    const response = await api.get(`/identity/users?page=${page}&size=${perPage}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error during getting users:', error);
    throw error;
  }
};

export const createInquiry = async (
  description: string,
  width: number,
  height: number,
  depth: number,
  weight: number,
  sourceStreet: string,
  sourceBuildingNumber: string,
  sourceApartmentNumber: string,
  sourceCity: string,
  sourceZipCode: string,
  sourceCountry: string,
  destinationStreet: string,
  destinationBuildingNumber: string,
  destinationApartmentNumber: string,
  destinationCity: string,
  destinationZipCode: string,
  destinationCountry: string,
  priority: string,
  atWeekend: boolean,
  pickupDate: string,
  deliveryDate: string,
  isCompany: boolean,
  vipPackage: boolean
) => {
  try {
    const inquiryResponse = await api.post(`/parcels`, {
      description,
      width,
      height,
      depth,
      weight,
      sourceStreet,
      sourceBuildingNumber,
      sourceApartmentNumber,
      sourceCity,
      sourceZipCode,
      sourceCountry,
      destinationStreet,
      destinationBuildingNumber,
      destinationApartmentNumber,
      destinationCity,
      destinationZipCode,
      destinationCountry,
      priority,
      atWeekend,
      pickupDate,
      deliveryDate,
      isCompany,
      vipPackage
    }, {
      headers: getAuthHeader()});

    // return response.data;

    try {
      const offerResponse = await new Promise((resolve, reject) => {
        setTimeout(() => {
          api.get(`deliveries-service/deliveries`, { params: { parcelId: inquiryResponse.data.parcelId } })
            .then(resolve)
            .catch(reject);
        }, 30000); // Wait for 30 seconds
      });

      return { inquiry: inquiryResponse, offers: offerResponse };
    } catch (offerError) {
      console.error('Error fetching courier offers:', offerError);
      // Return the inquiry response even if fetching offers fails
      return { inquiry: inquiryResponse.data, offers: null };
    }

  } catch (inquiryError) {
    if (axios.isAxiosError(inquiryError)) {
      console.error('Error during inquiry creation (Axios error):', inquiryError.response?.data || inquiryError.message);
    } else {
      console.error('Error during inquiry creation:', inquiryError);
    }
    throw inquiryError;
  }
};

export const getInquiries = async () => {
  try {
    const response = await api.get(`/parcels`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error during getting inquiries:', error);
    throw error;
  }
};


export const updateParcel = async (parcelId: string, data: any) => {
  try {
    const response = await api.put(`/parcels/${parcelId}`, data, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error updating parcel:', error);
    throw error;
  }
};

export const deleteParcel = async (parcelId: string) => {
  try {
    const response = await api.delete(`/parcels/${parcelId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error deleting parcel:', error);
    throw error;
  }
};

export const getParcel = async (parcelId: string) => {
  try {
    const response = await api.get(`/parcels/${parcelId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error fetching parcel:', error);
    throw error;
  }
};

export const getCouriers = async (page = 1, perPage = defaultPageLimit) => {
  try {
    const response = await api.get(`/couriers?page=${page}&size=${perPage}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error during getting couriers:', error);
    throw error;
  }
};

export const getCourier = async (courierId) => {
  try {
    const response = await api.get(`/couriers/${courierId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error fetching courier:', error);
    throw error;
  }
};

export const createCourier = async (courierData) => {
  try {
    const response = await api.post(`/couriers`, courierData, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error creating courier:', error);
    throw error;
  }
};

export const updateCourier = async (courierId, courierData) => {
  try {
    const response = await api.put(`/couriers/${courierId}`, courierData, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error updating courier:', error);
    throw error;
  }
};

export const deleteCourier = async (courierId) => {
  try {
    const response = await api.delete(`/couriers/${courierId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error deleting courier:', error);
    throw error;
  }
};

export const getDeliveries = async (deliveryId: string) => {
  try {
    const response = await api.get(`/deliveries/${deliveryId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error fetching delivery:', error);
    throw error;
  }
};

export const getDelivery = async (deliveryId) => {
  try {
    const response = await api.get(`/deliveries/${deliveryId}`, { headers: getAuthHeader() });
    return response.data;
  } catch (error) {
    console.error('Error fetching delivery:', error);
    throw error;
  }
};

export const getCarPersonal = {};
export const deleteCar = {};
export const getParcels = {};
export const createCar = {};
export const updateCar = {};
export const getCar = {};
export const getCars = {};
export const createParcel = {};
export const getParcelsForCar = {};
export const getParcelsForCourier = {};