import { useEffect, useState, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchApplications,
  approveApplication,
  rejectApplication,
  downloadApplicationDocx,
  exportApplicationsXlsx,
} from "../../api/application.service";
import { Dialog, Transition } from "@headlessui/react";

const FACULTY_LABELS = {
  pedagogical_institute: "Педагогический институт",
  arts_humanities: "Высшая школа искусства и гуманитарных наук",
  it_engineering: "Высшая школа ИТ и инженерии",
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

function CommentTextarea({ commentRef, modal }) {
  const [localComment, setLocalComment] = useState("");

  useEffect(() => {
    if (modal.open && modal.type === "reject") {
      setLocalComment("");
    }
  }, [modal.open, modal.type]);

  useEffect(() => {
    if (modal.type === "reject" && commentRef.current) {
      commentRef.current.focus();
    }
  }, [modal.open, modal.type]);

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700">
        Комментарий (обязательно)
      </label>
      <textarea
        ref={commentRef}
        className="mt-1 w-full p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
        rows={4}
        value={localComment}
        onChange={(e) => setLocalComment(e.target.value)}
        placeholder="Укажите причину отклонения..."
      />
    </div>
  );
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.is_staff;

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: "",
    faculty: "",
    ordering: "-created_at",
  });

  const commentRef = useRef(null);

  const [modal, setModal] = useState({
    open: false,
    type: "",
    id: null,
    email: "",
  });

  const updateModal = (updates) => {
    setModal((prev) => ({ ...prev, ...updates }));
  };

  const handleExcelDownload = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.faculty) params.append("faculty", filters.faculty);
    if (filters.ordering) params.append("ordering", filters.ordering);

    try {
      const res = await exportApplicationsXlsx({ params });
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applications_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Ошибка при скачивании Excel");
      console.error(err);
    }
  };

  const handleDocxDownload = async (id) => {
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
      console.error(err);
    }
  };

  const fetchApps = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.faculty) params.append("faculty", filters.faculty);
    if (filters.ordering) params.append("ordering", filters.ordering);

    try {
      const res = await fetchApplications({ params });
      setApps(res.data || []);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [filters]);

  const openModal = (type, id, email) => {
    updateModal({ open: true, type, id, email });
  };

  const closeModal = () => updateModal({ open: false });

  const handleAction = async () => {
    try {
      if (modal.type === "approve") {
        await approveApplication(modal.id, "");
      } else {
        const comment = commentRef.current?.value?.trim() || "";
        if (!comment) {
          alert("Комментарий обязателен при отклонении");
          return;
        }
        await rejectApplication(modal.id, comment);
      }
      fetchApps();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка");
    }
  };

  const handleRowClick = (app) => {
    if (app.status === "draft") {
      navigate(`/applications/${app.id}/edit`);
    } else {
      navigate(`/applications/${app.id}`);
    }
  };

  const ActionModal = () => (
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
                <p className="mt-2 text-sm text-gray-600">{modal.email}</p>

                {modal.type === "reject" && <CommentTextarea commentRef={commentRef} modal={modal} />}

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
                      modal.type === "approve"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
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
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {isAdmin ? "Все заявки (админ)" : "Мои заявки"}
        </h1>
        <div className="flex gap-3">
        <a
          href="/instruction.pdf"
          download="instruction.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" />
          </svg>
          Инструкция
        </a>
          {!isAdmin && (
            <button
              onClick={() => navigate("/applications/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Подать заявку
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleExcelDownload}
              className="px-4  py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2-2z" />
              </svg>
              Экспорт Excel
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="submitted">Отправлено</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
          </select>

          <select
            value={filters.faculty}
            onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">Все факультеты</option>
            {Object.entries(FACULTY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filters.ordering}
            onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="-created_at">Новые сначала</option>
            <option value="created_at">Старые сначала</option>
          </select>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Загрузка...</p>
        ) : apps.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Заявок нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Факультет</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Год</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Заявка</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Детали</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apps.map((app, index) => {
                  const badge = STATUS_BADGE[app.status] || { label: app.status_display, color: "bg-gray-100 text-gray-800" };
                  const userName = app.owner_full_name || app.owner_email || "—";
                  const isDraft = app.status === 'draft';

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(app)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{app.id.slice(0, 8)}</td>
                      {isAdmin && <td className="px-4 py-3 text-sm">{userName}</td>}
                      <td className="px-4 py-3 text-sm">{FACULTY_LABELS[app.faculty] || "—"}</td>
                      <td className="px-4 py-3 text-sm">{app.report_year || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDocxDownload(app.id)}
                          className="text-blue-600 hover:underline text-sm font-medium"
                        >
                          DOCX
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-indigo-600 hover:underline text-sm font-medium">
                          {isDraft ? "Редактировать" : "Открыть"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-4">
                            {(app.status !== "approved" && app.status !== "draft") && (
                              <button
                                onClick={() => openModal("approve", app.id, app.owner_email)}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Одобрить
                              </button>
                            )}
                            {(app.status !== "rejected" && app.status !== "draft") && (
                              <button
                                onClick={() => openModal("reject", app.id, app.owner_email)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Отклонить
                              </button>
                            )}
                            {(app.status === "approved" || app.status === "rejected" || app.status === "draft") && (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdmin && <ActionModal />}
    </div>
  );
}