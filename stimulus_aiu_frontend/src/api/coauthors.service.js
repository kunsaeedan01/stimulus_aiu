import axiosClient from "./axiosClient";


export async function getCoauthors({ search, signal } = {}) {
  const params = {};
  if (search) params.search = search;
  return axiosClient.get("/api/coauthors/", { params, signal });
}

export async function createCoauthor({ data, signal }) {
  return axiosClient.post("/api/coauthors/", data, { signal });
}

export async function updateCoauthor({ id, data, signal }) {
  return axiosClient.patch(`/api/coauthors/${id}/`, data, { signal });
}

export async function deleteCoauthor({ id, signal }) {
  return axiosClient.delete(`/api/coauthors/${id}/`, { signal });
}
