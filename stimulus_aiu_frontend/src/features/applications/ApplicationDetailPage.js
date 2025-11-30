import { useEffect, useState, useRef, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchApplicationDetail,
  approveApplication,
  rejectApplication,
  downloadApplicationDocx,
} from "../../api/application.service";
import { Dialog, Transition } from "@headlessui/react";

const FACULTY_LABELS = {
  pedagogical_institute: "Педагогический институт",
  arts_humanities: "Высшая школа искусства и гуманитарных наук",
  it_engineering: "Высшая школа информационных технологий и инженерии",
  natural_sciences: "Высшая школа естественных наук",
  economics: "Высшая школа экономики",
  law: "Высшая школа права",
};

const STATUS_BADGE = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-800" },
  submitted: { label: "Отправлено", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Одобрено", color: "bg-green-100 text-green-800" },
  rejected: { label: "Отклонено", color: "bg-red-100 text-red-800" },
};

function CommentTextarea({ commentRef }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [commentRef.current]);

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700">
        Комментарий (обязательно)
      </label>
      <textarea
        ref={commentRef}
        className="mt-1 w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Укажите причину отклонения..."
      />
    </div>
  );
}

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.is_staff;

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const commentRef = useRef(null);

  const [modal, setModal] = useState({
    open: false,
    type: "", // "approve" | "reject"
  });

  const openModal = (type) => setModal({ open: true, type });
  const closeModal = () => setModal({ open: false, type: "" });

  const fetchDetail = async () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const res = await fetchApplicationDetail({ id, signal: controller.signal });
      setApplication(res.data);
    } catch (err) {
      if (err.name !== "CanceledError") {
        setError("Не удалось загрузить заявку. Возможно, она не существует.");
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDocxDownload = async () => {
    try {
      const res = await downloadApplicationDocx({ id });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `application_${id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Ошибка при скачивании DOCX");
    }
  };

  const handleAction = async () => {
    try {
      if (modal.type === "approve") {
        await approveApplication(id, "");
      } else {
        const comment = commentRef.current?.value?.trim();
        if (!comment) {
          alert("Комментарий обязателен при отклонении");
          return;
        }
        await rejectApplication(id, comment);
      }
      await fetchDetail();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка при изменении статуса");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const statusInfo = STATUS_BADGE[application.status] || {
    label: application.status_display || application.status,
    color: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Назад
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Заявка #{application.id.slice(0, 8)}
          </h1>
          <p className="text-gray-600 mt-1">
            {application.owner_email} • {FACULTY_LABELS[application.faculty] || "—"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {isAdmin && (
            <div className="flex gap-2">
              {application.status !== "approved" && (
                <button
                  onClick={() => openModal("approve")}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  Одобрить
                </button>
              )}
              {application.status !== "rejected" && (
                <button
                  onClick={() => openModal("reject")}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Отклонить
                </button>
              )}
              <button
                onClick={handleDocxDownload}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                DOCX
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-6 mb-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Отчётный год</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{application.report_year}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Создано</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(application.created_at).toLocaleString("ru-KZ", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </dd>
          </div>
          {application.admin_comment && (
            <div className="md:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Комментарий администратора</dt>
              <dd className="mt-1 text-gray-900 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                {application.admin_comment}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Публикации ({application.papers?.length || 0})
        </h2>

        {!application.papers || application.papers.length === 0 ? (
          <p className="text-gray-500 italic">Публикации не прикреплены.</p>
        ) : (
          <div className="space-y-6">
            {application.papers.map((paper, idx) => (
              <div key={paper.id} className="border-b last:border-0 pb-6 last:pb-0">
                <h3 className="font-medium text-gray-900 mb-2">
                  {idx + 1}. {paper.title || "Без названия"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Журнал/Источник:</span>{" "}
                    <span className="font-medium">{paper.journal_or_source || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Индексация:</span>{" "}
                    <span className="font-medium">
                      {paper.indexation === "scopus" ? "Scopus" : "Web of Science"}
                      {paper.indexation === "scopus" && paper.percentile ? ` (Перцентиль: ${paper.percentile})` : ""}
                      {paper.indexation === "wos" && paper.quartile ? ` (Квартиль: ${paper.quartile})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">DOI:</span>{" "}
                    {paper.doi ? (
                      <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {paper.doi}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Год:</span>{" "}
                    <span className="font-medium">{paper.year || "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Аффилиация AIU:</span>{" "}
                    <span className="font-medium">{paper.has_university_affiliation ? "Да" : "Нет"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Файл:</span>{" "}
                    {paper.file_upload ? (
                      <a href={paper.file_upload} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Скачать PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {paper.coauthors && paper.coauthors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Соавторы:</p>
                    <div className="flex flex-wrap gap-2">
                      {paper.coauthors.map((co) => (
                        <span
                          key={co.id}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {co.full_name}
                          {co.is_aiu_employee && " (AIU)"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку
        </button>
      </div>

      <Transition show={modal.open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                  <Dialog.Title className="text-lg font-medium">
                    {modal.type === "approve" ? "Одобрить" : "Отклонить"} заявку
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-gray-600">{application.owner_email}</p>

                  {modal.type === "reject" && <CommentTextarea commentRef={commentRef} />}

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleAction}
                      className={`px-4 py-2 rounded-lg text-sm text-white font-medium ${
                        modal.type === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {modal.type === "approve" ? "Одобрить" : "Отклонить"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}