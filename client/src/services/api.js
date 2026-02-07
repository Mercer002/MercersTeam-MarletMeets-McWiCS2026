import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export default api;
