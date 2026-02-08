import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001/api",
  timeout: 10000,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

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

export async function signupStudent(payload) {
  const response = await api.post("/auth/signup/student", payload);
  return response.data;
}

export async function signupSenior(payload) {
  const response = await api.post("/auth/signup/senior", payload);
  return response.data;
}

export async function login(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data;
}

export async function logout() {
  const response = await api.post("/auth/logout");
  return response.data;
}

export async function fetchStudentProfile() {
  const response = await api.get("/student/profile");
  return response.data;
}

export async function updateStudentProfile(payload) {
  const response = await api.post("/student/profile", payload);
  return response.data;
}

export async function fetchStudentMatches() {
  const response = await api.get("/student/matches");
  return response.data;
}

export async function fetchStudentSelection() {
  const response = await api.get("/student/selection");
  return response.data;
}

export async function fetchStudentMapData() {
  const response = await api.get("/student/map-data");
  return response.data;
}

export async function selectSenior(payload) {
  const response = await api.post("/student/select", payload);
  return response.data;
}

export async function deselectSenior(seniorId) {
  const response = await api.delete(`/student/select/${seniorId}`);
  return response.data;
}

export async function fetchSeniorTasks() {
  const response = await api.get("/senior/tasks");
  return response.data;
}

export async function fetchSeniorProfile() {
  const response = await api.get("/senior/profile");
  return response.data;
}

export async function updateSeniorProfile(payload) {
  const response = await api.post("/senior/profile", payload);
  return response.data;
}

export async function createSeniorTask(payload) {
  const response = await api.post("/senior/tasks", payload);
  return response.data;
}

export async function deleteSeniorTask(taskId) {
  const response = await api.delete(`/senior/tasks/${taskId}`);
  return response.data;
}

export async function fetchSeniorNotifications() {
  const response = await api.get("/senior/notifications");
  return response.data;
}

export async function fetchAdminOverview() {
  const response = await api.get("/admin/overview");
  return response.data;
}

export default api;
