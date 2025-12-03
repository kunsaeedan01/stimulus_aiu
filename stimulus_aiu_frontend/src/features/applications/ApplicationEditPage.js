import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ApplicationForm from "./ApplicationForm";
import { fetchApplicationDetail } from "../../api/application.service";

export default function ApplicationEditPage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetchApplicationDetail({ id, signal: ac.signal });
        const app = res.data;
        const formattedData = {
          faculty: app.faculty || "",
          report_year: String(app.report_year || new Date().getFullYear()),
          papers: (app.papers || []).map((p) => ({
            id: p.id,
            title: p.title || "",
            journal_or_source: p.journal_or_source || "",
            indexation: p.indexation || "scopus",
            quartile: p.quartile || "",
            percentile: p.percentile || "",
            doi: p.doi || "",
            publication_date: p.publication_date || "",
            year: p.year || "",
            number: p.volume
              ? `${p.number || ""} (${p.volume})`
              : p.number || "",
            volume: "",
            pages: p.pages || "",
            has_university_affiliation: p.has_university_affiliation || false,
            registered_in_platonus: p.registered_in_platonus || false,
            coauthors: (p.coauthors || []).map((c) => ({
              id: c.id,
              is_aiu_employee: c.is_aiu_employee || false,
              full_name: c.full_name || "",
              position: c.position || "",
              subdivision: c.subdivision || "",
              telephone: c.telephone || "",
              email: c.email || "",
            })),
            file_upload: null,
          })),
        };

        setInitialData(formattedData);
      } catch (err) {
        if (err.name !== "CanceledError") {
          console.error(err);
          setError("Не удалось загрузить черновик.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }

    return () => ac.abort();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Загрузка данных заявки...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-semibold text-gray-900">
        Редактирование заявки
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Вы можете изменить данные черновика или отправить его.
      </p>

      {initialData && (
        <ApplicationForm initialValues={initialData} applicationId={id} />
      )}
    </div>
  );
}