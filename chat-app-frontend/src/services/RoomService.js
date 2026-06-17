import { httpClient } from "../config/AxiosHelper";

export const createRoomApi = async (roomId) => {
  // Django DRF expects a JSON payload for creation if we didn't override behavior
  const response = await httpClient.post(`/api/v1/rooms/`, { room_id: roomId });
  return response.data;
};

export const joinChatApi = async (roomId) => {
  const response = await httpClient.get(`/api/v1/rooms/${roomId}/`);
  return response.data;
};

export const getMessagess = async (roomId, size = 50, page = 1) => {
  // Django DRF pagination starts at page 1 by default
  const response = await httpClient.get(
    `/api/v1/rooms/${roomId}/messages/?page=${page}`
  );
  // DRF PageNumberPagination returns { count, next, previous, results }
  return response.data.results || response.data;
};
