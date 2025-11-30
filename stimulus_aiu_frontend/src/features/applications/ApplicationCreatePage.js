import React from "react";
import ApplicationForm from "./ApplicationForm";

export default function ApplicationCreatePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-semibold text-gray-900">
        Новая заявка
      </h2>
      <p className="text-gray-600 mt-1 mb-6">
        Заполните данные заявки и всех публикаций, входящих в неё.
      </p>
      <ApplicationForm />
    </div>
  );
}