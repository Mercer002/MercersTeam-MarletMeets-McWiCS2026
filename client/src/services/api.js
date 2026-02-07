import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

export async function checkHealth() {
  const response = await api.get("/health");
  return response.data;
}

export async function createStudent(payload) {
  const response = await api.post("/students", payload);
  return response.data;
}

export async function createSenior(payload) {
  const response = await api.post("/seniors", payload);
  return response.data;
}

export async function listSeniors() {
  const response = await api.get("/seniors");
  return response.data;
}

export async function getMatchesForSenior(seniorId) {
  const response = await api.get(`/matches/${seniorId}`);
  return response.data;
}

export async function createSession(payload) {
  const response = await api.post("/sessions", payload);
  return response.data;
}

export async function fetchDashboard() {
  const response = await api.get("/dashboard");
  return response.data;
}

export default api;
