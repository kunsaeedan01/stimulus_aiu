import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { register as apiRegister, login } from "../../api/auth.service";
import { useState } from "react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      full_name: "",
      position: "",
      subdivision: "",
      telephone: "",
      password: "",
      password_confirm: "",
    },
  });

  const password = watch("password");

  const onSubmit = async (values) => {
    setLoading(true);
    setServerError(null);

    try {
      await apiRegister({
        email: values.email,
        full_name: values.full_name,
        position: values.position,
        subdivision: values.subdivision,
        telephone: values.telephone,
        password: values.password,
      });
      const loginRes = await login({
        email: values.email,
        password: values.password,
      });

      if (loginRes.ok) {
        navigate("/applications", { replace: true });
      } else {
        navigate("/login");
      }
    } catch (e) {
      setServerError("Ошибка при регистрации. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg bg-white shadow rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Регистрация</h1>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Заполните форму, чтобы создать учетную запись.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Полное имя</label>
            <input
              type="text"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("full_name", { required: "Введите полное имя" })}
            />
            {errors.full_name && <p className="text-sm text-red-600">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("email", {
                required: "Введите email",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Некорректный email",
                },
              })}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Должность</label>
            <input
              type="text"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("position", { required: "Введите должность" })}
            />
            {errors.position && <p className="text-sm text-red-600">{errors.position?.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Подразделение/факультет</label>
            <input
              type="text"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("subdivision", { required: "Введите подразделение/факультет" })}
            />
            {errors.subdivision && <p className="text-sm text-red-600">{errors.subdivision.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Телефон</label>
            <input
              type="text"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("telephone", { required: "Введите телефон" })}
            />
            {errors.telephone && <p className="text-sm text-red-600">{errors.telephone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Пароль</label>
            <input
              type="password"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("password", {
                required: "Введите пароль",
                minLength: { value: 8, message: "Минимум 8 символов" },
              })}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Повторите пароль</label>
            <input
              type="password"
              className="mt-1 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
              {...register("password_confirm", {
                required: "Повторите пароль",
                validate: (value) => value === password || "Пароли не совпадают",
              })}
            />
            {errors.password_confirm && <p className="text-sm text-red-600">{errors.password_confirm.message}</p>}
          </div>

          {serverError && <div className="text-sm text-red-600 text-center">{serverError}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Создание..." : "Создать аккаунт"}
          </button>

          <p className="text-sm text-gray-500 text-center mt-4">
            Уже есть аккаунт?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-blue-600 hover:underline"
            >
              Войти
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}