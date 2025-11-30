import axiosClient from "./axiosClient";


export async function getReportYears({ signal } = {}) {
  return axiosClient.get("/api/meta/report_years/", { signal });
}
