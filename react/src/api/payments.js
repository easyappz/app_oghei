import instance from './axios';

function safeParseJSON(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

function normalizeApiError(error, defaultMessage) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = (data && (data.message || data.error)) || error?.message || defaultMessage || 'Request failed';
  const url = error?.config?.url;
  const method = error?.config?.method;
  const payload = error?.config?.data ? safeParseJSON(error.config.data) : undefined;

  return {
    name: 'ApiError',
    message,
    status,
    data,
    url,
    method,
    request: {
      headers: error?.config?.headers,
      payload,
    },
  };
}

export async function getProduct() {
  try {
    const response = await instance.get('/api/payments/product');
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Не удалось загрузить товар');
  }
}

export async function sendInvoice(chatId) {
  try {
    const response = await instance.post('/api/payments/invoice', { chatId: Number(chatId) });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'Не удалось отправить счёт');
  }
}

export async function getPricesPreview() {
  try {
    const response = await instance.get('/api/payments/prices-preview');
    return response.data;
  } catch (error) {
    // Пробрасываем нормализованную ошибку, UI обработает 404 как недоступность диагностики
    throw normalizeApiError(error, 'Не удалось получить предпросмотр цен');
  }
}
