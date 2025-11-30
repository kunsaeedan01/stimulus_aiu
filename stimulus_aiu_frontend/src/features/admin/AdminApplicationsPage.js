import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listApplications,
  approveApplication,
  rejectApplication,
} from "../../api/application.service";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const FACULTY_LABELS = {
  pedagogical_institute: "Педагогический институт",
  arts_humanities: "Высшая школа искусства и гуманитарных наук",
  it_engineering: "Высшая школа ИТ и инженерии",
  natural_sciences: "Высшая школа естественных наук",
  economics: "Высшая школа экономики",
  law: "Высшая школа права",
};

const STATUS_BADGE = {
  submitted: { label: "Отправлено", color: "bg-yellow-100 text-yellow-800" },
  approved:  { label: "Одобрено",  color: "bg-green-100 text-green-800" },
  rejected:  { label: "Отклонено", color: "bg-red-100 text-red-800" },
};

export default function AdminApplicationsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    faculty: "",
    report_year: "",
    ordering: "-created_at",
  });


  const [modal, setModal] = useState({
    open: false,
    type: "",
    id: null,
    email: "",
    comment: "",
  });

  const fetchApps = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
    try {
      const res = await listApplications({ params });
      setApps(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [filters]);

  const openModal = (type, id, email) => {
    setModal({ open: true, type, id, email, comment: "" });
  };

  const closeModal = () => setModal({ ...modal, open: false });

  const handleAction = async () => {
    try {
      if (modal.type === "approve") {
        await approveApplication(modal.id, modal.comment);
      } else {
        if (!modal.comment.trim()) {
          alert("Комментарий обязателен при отклонении");
          return;
        }
        await rejectApplication(modal.id, modal.comment);
      }
      fetchApps();
      closeModal();
    } catch (err) {
      alert(err.response?.data?.detail || "Ошибка");
    }
  };

  const downloadXlsx = () => {
    const params = new URLSearchParams(filters);
    window.location.href = `/api/applications/export_xlsx/?${params}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Все заявки (админ)</h1>
        <button
          onClick={downloadXlsx}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Экспорт Excel
        </button>
      </div>
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="">Все статусы</option>
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

        <input
          type="number"
          placeholder="Год"
          value={filters.report_year}
          onChange={(e) => setFilters({ ...filters, report_year: e.target.value })}
          className="rounded-md border-gray-300 text-sm"
        />

        <select
          value={filters.ordering}
          onChange={(e) => setFilters({ ...filters, ordering: e.target.value })}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="-created_at">Новые сначала</option>
          <option value="created_at">Старые сначала</option>
        </select>
      </div>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Загрузка...</p>
        ) : apps.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Заявок нет</p>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Факультет</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Год</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apps.map((app) => {
                const badge = STATUS_BADGE[app.status] || { label: app.status_display, color: "bg-gray-100 text-gray-800" };
                return (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{app.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm">{app.owner_email}</td>
                    <td className="px-4 py-3 text-sm">{FACULTY_LABELS[app.faculty] || "—"}</td>
                    <td className="px-4 py-3 text-sm">{app.report_year}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm space-x-3">
                      {app.status === "submitted" && (
                        <>
                          <button
                            onClick={() => openModal("approve", app.id, app.owner_email)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Одобрить
                          </button>
                          <button
                            onClick={() => openModal("reject", app.id, app.owner_email)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      <a
                        href={`/api/applications/${app.id}/docx/`}
                        className="text-blue-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        DOCX
                      </a>
                      <button
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="text-indigo-600 hover:underline"
                      >
                        Детали
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
                  <Dialog.Title className="text-lg font-medium flex items-center gap-2">
                    {modal.type === "approve" ? "✅" : "❌"}
                    {modal.type === "approve" ? "Одобрить" : "Отклонить"} заявку
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-gray-600">{modal.email}</p>

                  {modal.type === "reject" && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Комментарий (обязательно)
                      </label>
                      <textarea
                        className="mt-1 w-full p-3 border rounded-lg"
                        rows={4}
                        value={modal.comment}
                        onChange={(e) => setModal({ ...modal, comment: e.target.value })}
                        placeholder="Укажите причину отклонения..."
                      />
                    </div>
                  )}

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
    </div>
  );
}