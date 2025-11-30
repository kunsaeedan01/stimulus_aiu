import axiosClient from "./axiosClient";

export async function login({ email, password, signal } = {}) {
  const res = await axiosClient.post(
    "/api/auth/login/",
    { email, password },
    { signal }
  );
  const { access, refresh } = res.data;
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  return res;
}

export async function me({ signal } = {}) {
  return axiosClient.get("/api/auth/me/", { signal });
}

export async function register({
  email,
  full_name,
  position,
  subdivision,
  telephone,
  password,
  signal,
} = {}) {
  return axiosClient.post(
    "/api/auth/register/",
    { email, full_name, position, subdivision, telephone, password },
    { signal }
  );
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
