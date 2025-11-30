import axiosClient from "./axiosClient";

export async function fetchFaculties({ signal } = {}) {
  return axiosClient.get("/api/meta/faculties/", { signal });
}

export async function fetchReportYears({ signal } = {}) {
  return axiosClient.get("/api/meta/report_years/", { signal });
}

export async function fetchApplications({ params = {}, signal } = {}) {
  return axiosClient.get("/api/applications/", { params, signal });
}

export async function fetchApplicationDetail({ id, signal } = {}) {
  return axiosClient.get(`/api/applications/${id}/`, { signal });
}

export async function createApplication({ faculty, report_year, signal } = {}) {
  return axiosClient.post(
    "/api/applications/",
    { faculty, report_year },
    { signal }
  );
}


function buildPaperFormData(data) {
  const formData = new FormData();

  const simpleKeys = [
    "application",
    "title",
    "journal_or_source",
    "indexation",
    "quartile",
    "percentile",
    "doi",
    "publication_date",
    "year",
    "number",
    "volume",
    "pages",
    "site_source",
    "source_url",
    "has_university_affiliation",
    "registered_in_platonus",
  ];

  simpleKeys.forEach((key) => {
    const value = data[key];
    if (value !== undefined && value !== null) {
        formData.append(key, value);
    }
  });

  if (Array.isArray(data.coauthors)) {
    const cleaned = data.coauthors
      .map((c) => ({
        full_name: c.full_name?.trim() || "",
        position: c.position?.trim() || "",
        subdivision: c.subdivision?.trim() || "",
        telephone: c.telephone?.trim() || "",
        email: c.email?.trim() || "",
        is_aiu_employee: !!c.is_aiu_employee,
      }))
      .filter((c) => c.full_name);

    if (cleaned.length > 0) {
      formData.append("coauthors_json", JSON.stringify(cleaned));
    } else {
        formData.append("coauthors_json", JSON.stringify([]));
    }
  }

  if (data.file_upload instanceof File) {
    formData.append("file_upload", data.file_upload);
  }

  return formData;
}


export async function createPaper({ data, signal } = {}) {
  const formData = buildPaperFormData(data);
  return axiosClient.post("/api/papers/", formData, {
    signal,
    headers: { "Content-Type": "multipart/form-data" },
  });
}


export async function updatePaper(id, data, signal) {
  const formData = buildPaperFormData(data);
  return axiosClient.patch(`/api/papers/${id}/`, formData, {
    signal,
    headers: { "Content-Type": "multipart/form-data" },
  });
}


export async function deletePaper(id) {
  return axiosClient.delete(`/api/papers/${id}/`);
}

export async function listApplications({ signal } = {}) {
  return axiosClient.get("/api/applications/", { signal });
}

export async function approveApplication(id, comment = "") {
  return axiosClient.post(`/api/applications/${id}/approve/`, { comment });
}

export async function rejectApplication(id, comment = "") {
  if (!comment?.trim()) {
    throw new Error("Комментарий обязателен");
  }
  return axiosClient.post(`/api/applications/${id}/reject/`, { comment });
}

export async function downloadApplicationDocx({ id, signal } = {}) {
  return axiosClient.get(`/api/applications/${id}/docx/`, {
    responseType: "blob",
    signal,
  });
}

export async function exportApplicationsXlsx({ params = {}, signal } = {}) {
  return axiosClient.get("/api/applications/export_xlsx/", {
    params,
    signal,
    responseType: "blob",
  });
}

export const updateApplication = async (id, data) => {
  return axiosClient.patch(`/api/applications/${id}/`, data);
};

export const submitApplication = async (id) => {
  return axiosClient.post(`/api/applications/${id}/submit/`);
};