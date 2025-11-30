import axiosClient from "./axiosClient";

export async function getPapers({ applicationId, signal } = {}) {
  const params = {};
  if (applicationId) params.application = applicationId;
  return axiosClient.get("/api/papers/", { params, signal });
}

export async function getPaper({ id, signal }) {
  return axiosClient.get(`/api/papers/${id}/`, { signal });
}

export async function createPaper({ data, signal }) {
  return axiosClient.post("/api/papers/", data, { signal });
}

export async function updatePaper({ id, data, signal }) {
  return axiosClient.patch(`/api/papers/${id}/`, data, { signal });
}

export async function deletePaper({ id, signal }) {
  return axiosClient.delete(`/api/papers/${id}/`, { signal });
}
