import React, { useEffect, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import './App.css';
import { getProduct, sendInvoice } from './api/payments';

function App() {
  const fallbackProduct = {
    id: 'arabic_course',
    title: 'Арабский курс',
    description: 'Практический онлайн-курс с живыми примерами и заданиями. Доступ к материалам 24/7.',
    currency: 'RUB',
    price: 5500,
  };

  const [product, setProduct] = useState(fallbackProduct);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [errorProduct, setErrorProduct] = useState('');

  const [maxPrice, setMaxPrice] = useState(6000);
  const [chatId, setChatId] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingProduct(true);
      setErrorProduct('');
      try {
        const data = await getProduct();
        if (active && data && typeof data.price === 'number') {
          setProduct(data);
        }
      } catch (e) {
        setErrorProduct('Не удалось загрузить данные товара. Показаны значения по умолчанию.');
      } finally {
        setLoadingProduct(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const isVisible = product && typeof product.price === 'number' ? product.price <= maxPrice : true;

  function formatPrice(value) {
    if (typeof value !== 'number') return '';
    return `${value.toLocaleString('ru-RU')} ₽`;
  }

  async function handleSend() {
    setStatus(null);
    const id = Number(chatId);

    if (!chatId || Number.isNaN(id) || id <= 0) {
      setStatus({ type: 'error', message: 'Введите корректный chatId (положительное число).' });
      return;
    }

    try {
      setSending(true);
      const result = await sendInvoice(id);
      if (result && result.ok) {
        setStatus({ type: 'success', message: 'Счёт успешно отправлен. Проверьте Telegram.' });
      } else {
        setStatus({ type: 'error', message: result?.message || 'Не удалось отправить счёт.' });
      }
    } catch (e) {
      setStatus({ type: 'error', message: e?.message || 'Произошла ошибка при отправке счёта.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <ErrorBoundary>
      <div className="page">
        <main className="container">
          <h1 className="title">Оплата курса</h1>

          <div className="filters">
            <label htmlFor="maxPrice">Показывать товары до:</label>
            <select
              id="maxPrice"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            >
              <option value={5000}>5 000 ₽</option>
              <option value={6000}>6 000 ₽</option>
            </select>
          </div>

          {loadingProduct && <div className="hint">Загрузка товара...</div>}
          {errorProduct && <div className="hint error">{errorProduct}</div>}

          {isVisible && (
            <section className="product-card" aria-label="Карточка товара">
              <div className="product-content">
                <h2 className="product-title">{product?.title || 'Товар'}</h2>
                <p className="product-desc">{product?.description || 'Описание будет позже.'}</p>
                <div className="product-price">{formatPrice(product?.price)}</div>
              </div>
            </section>
          )}

          <section className="form" aria-label="Отправка счёта в Telegram">
            <h3 className="form-title">Отправить счёт в Telegram</h3>
            <label className="label" htmlFor="chatId">Chat ID</label>
            <input
              id="chatId"
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="Например, 123456789"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <button className="button" onClick={handleSend} disabled={sending || !chatId}>
              {sending ? (
                <span className="btn-loading"><span className="spinner" /> Отправка...</span>
              ) : (
                'Отправить счёт в Telegram'
              )}
            </button>
            {status && (
              <div className={`status ${status.type}`} role="status">{status.message}</div>
            )}
          </section>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
