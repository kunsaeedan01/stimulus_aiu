import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  fetchFaculties,
  fetchReportYears,
  createApplication,
  createPaper,
  updateApplication,
  updatePaper,
  deletePaper,
  submitApplication,
} from "../../api/application.service";

const INDEXATION_OPTIONS = [
  { value: "scopus", label: "Scopus" },
  { value: "wos", label: "Web of Science" },
];

const LOCAL_FACULTIES = [
  { value: "pedagogical_institute", label: "Педагогический институт" },
  { value: "arts_humanities", label: "Высшая школа искусства и гуманитарных наук" },
  { value: "it_engineering", label: "Высшая школа информационных технологий и инженерии" },
  { value: "natural_sciences", label: "Высшая школа естественных наук" },
  { value: "economics", label: "Высшая школа экономики" },
  { value: "law", label: "Высшая школа права" },
];

export default function ApplicationForm({ initialValues, applicationId }) {
  const navigate = useNavigate();
  const isEditMode = Boolean(applicationId);

  const [faculties, setFaculties] = useState(LOCAL_FACULTIES);
  const [reportYears, setReportYears] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [originalPapers] = useState(initialValues?.papers || []);

  const {
    control,
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      faculty: "",
      report_year: new Date().getFullYear().toString(),
      papers: [
        {
          id: null,
          title: "",
          journal_or_source: "",
          indexation: "scopus",
          quartile: "",
          percentile: "",
          doi: "",
          publication_date: "",
          year: "",
          number: "",
          volume: "",
          pages: "",
          source_url: "",
          has_university_affiliation: false,
          registered_in_platonus: false,
          coauthors: [
            {
              is_aiu_employee: false,
              full_name: "",
              position: "",
              subdivision: "",
              telephone: "",
              email: "",
            },
          ],
          file_upload: null,
        },
      ],
    },
  });

  const {
    fields: paperFields,
    append: appendPaper,
    remove: removePaper,
  } = useFieldArray({
    control,
    name: "papers",
  });

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [facRes, yearsRes] = await Promise.allSettled([
          fetchFaculties({ signal: ac.signal }),
          fetchReportYears({ signal: ac.signal }),
        ]);

        if (facRes.status === "fulfilled" && Array.isArray(facRes.value.data)) {
          const apiFacs = facRes.value.data
            .map((f) => {
              if (typeof f === "object" && !Array.isArray(f))
                return { value: f.value, label: f.label };
              if (Array.isArray(f) && f.length >= 2)
                return { value: f[0], label: f[1] };
              return null;
            })
            .filter(Boolean);
          if (apiFacs.length) setFaculties(apiFacs);
        }

        if (yearsRes.status === "fulfilled" && Array.isArray(yearsRes.value.data)) {
          setReportYears(yearsRes.value.data);
        }
      } catch (err) {
        // ignore cancellation
      }
    })();
    return () => ac.abort();
  }, []);

  const onSave = (actionType) => handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    const isSubmitAction = actionType === 'submit';

    try {
      if (!values.faculty) {
        setError("faculty", { message: "Выберите факультет" });
        setSubmitting(false);
        return;
      }
      if (isSubmitAction) {
        if (!values.papers || values.papers.length === 0) {
          setServerError("Для отправки необходимо добавить хотя бы одну публикацию.");
          setSubmitting(false);
          return;
        }

        for (let i = 0; i < values.papers.length; i += 1) {
          const paper = values.papers[i];
          if (!paper.has_university_affiliation) {
            setError(`papers.${i}.has_university_affiliation`, { message: "Требуется подтверждение аффилиации." });
            setSubmitting(false);
            return;
          }
          if (!paper.registered_in_platonus) {
            setError(`papers.${i}.registered_in_platonus`, { message: "Требуется подтверждение Platonus." });
            setSubmitting(false);
            return;
          }
          if (paper.indexation === "scopus" && !paper.percentile) {
            setError(`papers.${i}.percentile`, { message: "Укажите перцентиль." });
            setSubmitting(false);
            return;
          }
          if (!paper.id && !paper.file_upload) {
             setError(`papers.${i}.file_upload`, { message: "Загрузите файл." });
             setSubmitting(false);
             return;
          }
        }
      }
      let currentAppId = applicationId;
      
      if (isEditMode) {
        await updateApplication(currentAppId, {
          faculty: values.faculty,
          report_year: values.report_year,
        });
      } else {
        const appRes = await createApplication({
          faculty: values.faculty,
          report_year: values.report_year,
        });
        currentAppId = appRes.data.id;
      }
      const processedPaperIds = new Set();

      for (const paper of values.papers) {
        const paperData = {
          application: currentAppId,
          ...paper,
          percentile: paper.percentile ? Number(paper.percentile) : null,
          volume: paper.volume ? Number(paper.volume) : null,
          coauthors: (paper.coauthors || []).filter(c => c.full_name?.trim()),
        };

        if (paper.id) {
          processedPaperIds.add(paper.id);
          await updatePaper(paper.id, paperData);
        } else {
          await createPaper({ data: paperData });
        }
      }
      if (isEditMode) {
        for (const orig of originalPapers) {
          if (!processedPaperIds.has(orig.id)) {
            await deletePaper(orig.id);
          }
        }
      }

      if (isSubmitAction) {
        await submitApplication(currentAppId);
        setSuccessMessage("Заявка успешно отправлена!");
      } else {
        setSuccessMessage("Черновик сохранен.");
      }

      setTimeout(() => {
        navigate("/applications");
      }, 1000);

    } catch (e) {
      console.error(e);
      setServerError(e.response?.data?.detail || "Ошибка при сохранении.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form className="space-y-6 bg-white shadow rounded-2xl p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Высшая школа</label>
          <select
            className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            {...register("faculty")}
          >
            <option value="">Выберите...</option>
            {faculties.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          {errors.faculty && <p className="mt-1 text-sm text-red-600">{errors.faculty.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Отчётный год</label>
          <select
            className="mt-1 block w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            {...register("report_year")}
          >
            {reportYears.length === 0 && (
              <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
            )}
            {reportYears.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Публикации</h3>
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50"
            onClick={() => appendPaper({
              title: "",
              journal_or_source: "",
              indexation: "scopus",
              has_university_affiliation: false,
              registered_in_platonus: false,
              coauthors: [{ is_aiu_employee: false, full_name: "" }]
            })}
          >
            Добавить публикацию
          </button>
        </div>

        <div className="space-y-6">
          {paperFields.map((field, index) => (
            <PaperFieldItem
              key={field.id}
              index={index}
              control={control}
              register={register}
              errors={errors}
              removePaper={removePaper}
              papersCount={paperFields.length}
              clearErrors={clearErrors}
            />
          ))}
        </div>
      </div>

      {serverError && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{serverError}</div>}
      {successMessage && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">{successMessage}</div>}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          onClick={() => navigate("/applications")}
          disabled={submitting}
        >
          Отмена
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-gray-600 text-white font-medium hover:bg-gray-700 disabled:opacity-50"
          onClick={onSave('draft')}
          disabled={submitting}
        >
          {submitting ? "..." : "Сохранить как черновик"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          onClick={onSave('submit')}
          disabled={submitting}
        >
          {submitting ? "..." : "Отправить"}
        </button>
      </div>
    </form>
  );
}

function PaperFieldItem({ index, control, register, errors, removePaper, papersCount, clearErrors }) {
  const indexation = useWatch({
    control,
    name: `papers.${index}.indexation`,
    defaultValue: "scopus"
  });
  
  const fileId = useWatch({
    control,
    name: `papers.${index}.id`,
  });

  const { fields: coauthorFields, append, remove } = useFieldArray({
    control,
    name: `papers.${index}.coauthors`,
  });

  return (
    <div className="border border-gray-200 rounded-2xl p-5 space-y-5 bg-gray-50/50">
      <div className="flex items-center justify-between border-b pb-3">
        <h4 className="font-semibold text-gray-900">Публикация #{index + 1}</h4>
        {papersCount > 1 && (
          <button
            type="button"
            className="text-sm text-red-600 hover:text-red-800 font-medium"
            onClick={() => removePaper(index)}
          >
            Удалить
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Название</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border-gray-300"
            {...register(`papers.${index}.title`, { required: "Введите название" })}
          />
          {errors.papers?.[index]?.title && (
            <p className="mt-1 text-sm text-red-600">{errors.papers[index].title.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Журнал / источник</label>
          <input
            type="text"
            className="mt-1 block w-full rounded-lg border-gray-300"
            {...register(`papers.${index}.journal_or_source`)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Индексация</label>
          <select
            className="mt-1 block w-full rounded-lg border-gray-300"
            {...register(`papers.${index}.indexation`)}
          >
            {INDEXATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {indexation === "wos" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Квартиль</label>
            <select
              className="mt-1 block w-full rounded-lg border-gray-300"
              {...register(`papers.${index}.quartile`)}
            >
              <option value="">Не указано</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        )}

        {indexation === "scopus" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Перцентиль</label>
            <input
              type="number"
              min={1}
              max={99}
              className="mt-1 block w-full rounded-lg border-gray-300"
              {...register(`papers.${index}.percentile`)}
            />
            {errors.papers?.[index]?.percentile && (
              <p className="mt-1 text-sm text-red-600">{errors.papers[index].percentile.message}</p>
            )}
          </div>
        )}

        <div><label className="block text-sm font-medium text-gray-700">DOI</label><input type="text" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.doi`)} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Дата публикации</label><input type="date" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.publication_date`)} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Год</label><input type="number" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.year`)} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Номер (Issue)</label><input type="text" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.number`)} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Том (Volume)</label><input type="number" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.volume`)} /></div>
        <div><label className="block text-sm font-medium text-gray-700">Страницы</label><input type="text" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.pages`)} /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">URL публикации/Сайт-источник</label><input type="url" className="mt-1 block w-full rounded-lg border-gray-300" {...register(`papers.${index}.source_url`)} /></div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Соавторы</label>
          <div className="space-y-3">
            {coauthorFields.map((coField, aIndex) => (
              <CoauthorFieldItem 
                key={coField.id} 
                paperIndex={index} 
                index={aIndex} 
                register={register} 
                control={control}
                remove={remove} 
                total={coauthorFields.length} 
              />
            ))}
            <button
              type="button"
              className="text-sm font-medium text-blue-600 hover:underline"
              onClick={() => append({ is_aiu_employee: false, full_name: "" })}
            >
              + Добавить соавтора
            </button>
          </div>
        </div>

        <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`aff-${index}`}
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
                {...register(`papers.${index}.has_university_affiliation`)}
              />
              <label htmlFor={`aff-${index}`} className="ml-3 text-sm font-medium text-gray-700">Есть указание Astana International University</label>
            </div>
            {errors.papers?.[index]?.has_university_affiliation && <p className="ml-8 text-sm text-red-600">{errors.papers[index].has_university_affiliation.message}</p>}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id={`plat-${index}`}
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
                {...register(`papers.${index}.registered_in_platonus`)}
              />
              <label htmlFor={`plat-${index}`} className="ml-3 text-sm font-medium text-gray-700">Внесено в ИС Platonus</label>
            </div>
            {errors.papers?.[index]?.registered_in_platonus && <p className="ml-8 text-sm text-red-600">{errors.papers[index].registered_in_platonus.message}</p>}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Файл публикации (PDF)</label>
          <Controller
            control={control}
            name={`papers.${index}.file_upload`}
            render={({ field: { onChange } }) => (
              <input
                type="file"
                accept="application/pdf"
                className="mt-1 block w-full text-sm text-gray-700"
                onChange={(e) => {
                  onChange(e.target.files?.[0] || null);
                  clearErrors(`papers.${index}.file_upload`);
                }}
              />
            )}
          />
          <p className="text-xs text-gray-500 mt-1">{fileId ? "Загрузите новый файл для замены." : "Обязательно для новых."}</p>
          {errors.papers?.[index]?.file_upload && <p className="mt-1 text-sm text-red-600">{errors.papers[index].file_upload.message}</p>}
        </div>
      </div>
    </div>
  );
}

function CoauthorFieldItem({ paperIndex, index, register, control, remove, total }) {
  const isAiu = useWatch({
    control,
    name: `papers.${paperIndex}.coauthors.${index}.is_aiu_employee`,
  });

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-bold text-gray-700">Соавтор #{index + 1}</span>
        {total > 1 && (
          <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(index)}>
            Удалить
          </button>
        )}
      </div>

      <div className="flex items-center mb-3">
        <input
          type="checkbox"
          id={`aiu-check-${paperIndex}-${index}`}
          className="rounded border-gray-300 text-blue-600 mr-2"
          {...register(`papers.${paperIndex}.coauthors.${index}.is_aiu_employee`)}
        />
        <label htmlFor={`aiu-check-${paperIndex}-${index}`} className="text-sm font-medium text-gray-800">
          Является сотрудником AIU
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="ФИО соавтора"
            className="block w-full rounded-lg border-gray-300"
            {...register(`papers.${paperIndex}.coauthors.${index}.full_name`)}
          />
        </div>
        {isAiu && (
          <>
            <input type="text" placeholder="Должность" className="block w-full rounded-lg border-gray-300" {...register(`papers.${paperIndex}.coauthors.${index}.position`)} />
            <input type="text" placeholder="Подразделение/Факультет" className="block w-full rounded-lg border-gray-300" {...register(`papers.${paperIndex}.coauthors.${index}.subdivision`)} />
            <input type="text" placeholder="Телефон" className="block w-full rounded-lg border-gray-300" {...register(`papers.${paperIndex}.coauthors.${index}.telephone`)} />
            <input type="email" placeholder="Email" className="block w-full rounded-lg border-gray-300" {...register(`papers.${paperIndex}.coauthors.${index}.email`)} />
          </>
        )}
      </div>
    </div>
  );
}