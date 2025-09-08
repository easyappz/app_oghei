import instance from './axios';

export async function getProduct() {
  try {
    const response = await instance.get('/api/payments/product');
    return response.data;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    throw new Error(message);
  }
}

export async function sendInvoice(chatId) {
  try {
    const response = await instance.post('/api/payments/invoice', { chatId: Number(chatId) });
    return response.data;
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || 'Request failed';
    throw new Error(message);
  }
}
