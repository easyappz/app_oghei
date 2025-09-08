import React, { useEffect, useMemo, useState } from 'react';
import { getProduct, sendInvoice, getPricesPreview } from '../api/payments';

function formatCurrencyRUB(value) {
  if (typeof value !== 'number') return '';
  try {
    return `${value.toLocaleString('ru-RU')} ₽`;
  } catch (e) {
    return `${value} ₽`;
  }
}

function isDigits(str) {
  if (!str || typeof str !== 'string') return false;
  for (let i = 0; i < str.length; i += 1) {
    const c = str[i];
    if (c < '0' || c > '9') {
      return false;
    }
  }
  return true;
}

function serialize(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (_) {
    return String(obj);
  }
}

export default function PaymentsDashboard() {
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [productError, setProductError] = useState('');

  const [chatId, setChatId] = useState('');
  const [chatIdError, setChatIdError] = useState('');

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Prices preview diagnostics
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [preview, setPreview] = useState(null);
  const [showPreviewDetails, setShowPreviewDetails] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingProduct(true);
      setProductError('');
      try {
        const data = await getProduct();
        if (active) setProduct(data);
      } catch (e) {
        setProductError('Не удалось загрузить товар. Проверьте соединение или попробуйте позже.');
      } finally {
        setLoadingProduct(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Validate chatId on change
    if (chatId === '') {
      setChatIdError('');
      return;
    }
    if (!isDigits(chatId)) {
      setChatIdError('Разрешены только цифры.');
      return;
    }
    const n = Number(chatId);
    if (!Number.isFinite(n) || n <= 0) {
      setChatIdError('Введите положительное число больше нуля.');
      return;
    }
    setChatIdError('');
  }, [chatId]);

  const isSendDisabled = useMemo(() => {
    if (sending) return true;
    if (!chatId) return true;
    if (!!chatIdError) return true;
    return false;
  }, [sending, chatId, chatIdError]);

  async function handleSend() {
    setResult(null);
    setShowDetails(false);

    const payload = { chatId: Number(chatId) };

    try {
      setSending(true);
      const response = await sendInvoice(payload.chatId);
      const ok = !!response?.ok;
      setResult({
        ok,
        title: ok ? 'Счёт успешно отправлен' : 'Не удалось отправить счёт',
        message: ok ? 'Проверьте сообщения в Telegram.' : (response?.message || 'Сервер вернул ошибку.'),
        request: { url: '/api/payments/invoice', method: 'POST', payload },
        response: response || null,
        hint: null,
      });
      if (!ok) setShowDetails(true);
    } catch (err) {
      const status = err?.status;
      const errMessage = err?.message || 'Произошла ошибка при отправке счёта.';
      const serverData = err?.data;
      const text = typeof serverData?.error === 'string' ? serverData.error : (typeof serverData?.message === 'string' ? serverData.message : undefined);
      const combinedMessage = text ? `${errMessage} (${text})` : errMessage;

      let hint = null;
      const textForCheck = `${combinedMessage}`;
      if (textForCheck && textForCheck.includes('ETELEGRAM')) {
        hint = 'Telegram вернул ошибку. Проверьте корректность данных товара и формата цен на сервере (prices должны быть корректным JSON массивом объектов с полями label и amount в копейках), валюту и providerToken.';
      }

      setResult({
        ok: false,
        title: 'Ошибка при отправке счёта',
        message: combinedMessage,
        status,
        request: err?.request || { url: err?.url, method: err?.method, payload: { chatId: Number(chatId) } },
        response: serverData || null,
        hint,
      });
      setShowDetails(true);
    } finally {
      setSending(false);
    }
  }

  async function handlePreview() {
    setPreviewError('');
    setPreviewUnavailable(false);
    setPreview(null);
    setShowPreviewDetails(false);
    try {
      setPreviewLoading(true);
      const data = await getPricesPreview();
      setPreview(data || {});
    } catch (err) {
      if (err?.status === 404) {
        setPreviewUnavailable(true);
      } else {
        const message = err?.message || 'Не удалось получить предпросмотр цен.';
        setPreviewError(message);
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  const pricesArray = Array.isArray(preview?.prices) ? preview.prices : [];
  const validation = preview?.validation || null;
  const rawJSONStr = typeof preview?.rawJSON === 'string' ? preview.rawJSON : (preview?.rawJSON ? serialize(preview.rawJSON) : '');

  return (
    <div className="page">
      <main className="container">
        <h1 className="title">Оплата курса</h1>

        <section className="section">
          <h2 className="section-title">Товар</h2>
          {loadingProduct && <div className="hint">Загружаем информацию о товаре...</div>}
          {productError && <div className="status error">{productError}</div>}
          {product && !loadingProduct && (
            <div className="product-card">
              <div className="product-content">
                <h3 className="product-title">{product?.title || 'Товар'}</h3>
                <p className="product-desc">{product?.description || 'Описание товара появится позже.'}</p>
                <div className="product-price">{formatCurrencyRUB(product?.price)}</div>
                {product?.currency && (
                  <div className="muted-small">Валюта: {product.currency}</div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Отправка счёта</h2>
          <div className="row">
            <label className="label" htmlFor="chatId">Chat ID</label>
            <input
              id="chatId"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="Например, 123456789"
              value={chatId}
              onChange={(e) => setChatId(e.target.value.trim())}
              aria-invalid={!!chatIdError}
            />
            {!!chatIdError && <div className="hint error">{chatIdError}</div>}
          </div>
          <button className="button" onClick={handleSend} disabled={isSendDisabled}>
            {sending ? (
              <span className="btn-loading"><span className="spinner" /> Отправляем...</span>
            ) : (
              'Отправить счёт в Telegram'
            )}
          </button>

          {result && (
            <div className={`status ${result.ok ? 'success' : 'error'}`}>
              <div className="status-title">{result.title}</div>
              <div className="status-text">{result.message}</div>
              {typeof result.status === 'number' && (
                <div className="muted-small">Код статуса: {result.status}</div>
              )}
              {result.hint && (
                <div className="hint">Подсказка: {result.hint}</div>
              )}
              <div className="details-toggle">
                <button
                  className="link-button"
                  onClick={() => setShowDetails((v) => !v)}
                >
                  {showDetails ? 'Скрыть детали' : 'Показать детали (запрос/ответ)'}
                </button>
              </div>
              {showDetails && (
                <div className="details-grid">
                  <div>
                    <div className="muted-small">Запрос</div>
                    <pre className="code-block">{serialize(result.request)}</pre>
                  </div>
                  <div>
                    <div className="muted-small">Ответ</div>
                    <pre className="code-block">{serialize(result.response)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Диагностика цен</h2>
          <div className="hint">Получите предпросмотр массива prices, который сервер отправит в Telegram, а также результаты серверной валидации. Это поможет быстро выявить причину ошибки вида: "ETELEGRAM: 400 Bad Request: can't parse prices JSON object".</div>
          <button className="button" onClick={handlePreview} disabled={previewLoading}>
            {previewLoading ? (
              <span className="btn-loading"><span className="spinner" /> Загружаем предпросмотр...</span>
            ) : (
              'Проверить цены'
            )}
          </button>

          {previewUnavailable && (
            <div className="status error" style={{ marginTop: 10 }}>
              <div className="status-title">Диагностика временно недоступна</div>
              <div className="status-text">Эндпоинт /api/payments/prices-preview не найден (404). Скорее всего, бэкенд ещё не обновлён. Продолжайте тестировать отправку счёта, а после обновления сервера повторите попытку. Подсказка: на сервере должен формироваться валидный JSON массив объектов с полями label и amount (в копейках), а также корректная валюта и providerToken.</div>
            </div>
          )}

          {previewError && (
            <div className="status error" style={{ marginTop: 10 }}>
              <div className="status-title">Ошибка диагностики</div>
              <div className="status-text">{previewError}</div>
            </div>
          )}

          {preview && !previewUnavailable && !previewError && (
            <div className="diag-card">
              <div className="kv">
                <div className="kv-key">Валюта</div>
                <div className="kv-value"><span className="badge">{preview?.currency || '—'}</span></div>
              </div>

              <div className="kv" style={{ marginTop: 10 }}>
                <div className="kv-key">Prices</div>
                <div className="kv-value">
                  {pricesArray.length === 0 && (
                    <div className="muted-small">Массив цен пуст или не сформирован.</div>
                  )}
                  {pricesArray.length > 0 && (
                    <ul className="prices-list">
                      {pricesArray.map((p, idx) => (
                        <li key={String(idx)} className="price-item">
                          <div className="price-label">{typeof p?.label === 'string' ? p.label : '—'}</div>
                          <div className="price-amount">amount: {typeof p?.amount === 'number' ? p.amount : '—'} (в копейках)</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="kv" style={{ marginTop: 10 }}>
                <div className="kv-key">rawJSON</div>
                <div className="kv-value">
                  {rawJSONStr ? (
                    <pre className="code-block" style={{ maxHeight: 200 }}>{rawJSONStr}</pre>
                  ) : (
                    <div className="muted-small">Нет данных rawJSON.</div>
                  )}
                </div>
              </div>

              <div className="kv" style={{ marginTop: 10 }}>
                <div className="kv-key">Валидация сервера</div>
                <div className="kv-value">
                  {validation ? (
                    <div className={`status ${validation?.valid ? 'success' : 'error'}`} style={{ marginTop: 0 }}>
                      <div className="status-title">{validation?.valid ? 'OK: Валидация пройдена' : 'Ошибка: Валидация не пройдена'}</div>
                      {Array.isArray(validation?.errors) && validation.errors.length > 0 && (
                        <ul className="diag-errors">
                          {validation.errors.map((e, i) => (
                            <li key={String(i)}>{typeof e === 'string' ? e : serialize(e)}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="muted-small">Сервер не прислал результат валидации.</div>
                  )}
                </div>
              </div>

              <div className="details-toggle" style={{ marginTop: 8 }}>
                <button className="link-button" onClick={() => setShowPreviewDetails((v) => !v)}>
                  {showPreviewDetails ? 'Скрыть ответ сервера' : 'Показать полный ответ сервера'}
                </button>
              </div>
              {showPreviewDetails && (
                <div className="details-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div>
                    <div className="muted-small">Ответ</div>
                    <pre className="code-block">{serialize(preview)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Подсказки</h2>
          <div className="tips">
            <ul>
              <li>Чтобы узнать свой Chat ID: напишите боту любое сообщение, затем посмотрите логи бота или консоль сервера. Часто Chat ID отображается в ответах Telegram API.</li>
              <li>Если видите ошибку вида "ETELEGRAM: 400 Bad Request: can't parse prices JSON object" — проверьте на сервере формирование объекта цен: корректный JSON массив объектов с полями label и amount (в копейках), валюта и providerToken.</li>
              <li>При повторяющихся ошибках проверьте токен бота, права, доступность Telegram API и соответствие тела запроса схеме.</li>
              <li>Используйте валидный Chat ID (целое положительное число без пробелов и символов).</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
