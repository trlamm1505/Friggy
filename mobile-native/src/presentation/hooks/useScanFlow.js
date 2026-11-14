/**
 * useScanFlow — luồng scan AI dùng chung cho 3 màn (food / receipt / barcode).
 *
 * Luồng thật (BE dùng RabbitMQ + ai-service xử lý bất đồng bộ):
 *   1. Upload ảnh -> `POST /fridge/scan/<image|receipt|barcode>` (multipart `file`)
 *      -> trả ngay `{ scanId, status: 'pending', detectedItems: [] }`.
 *   2. Poll `GET /fridge/scan/:scanId` mỗi 2s (service tự backoff, tối đa 60s)
 *      tới khi `success` / `failed`.
 *   3. Trả về `{ scanId, scanType, items }` đã chuẩn hoá để màn review dùng thẳng.
 *
 * Quy tắc an toàn:
 *   - Unmount giữa chừng -> AbortController huỷ poll, không memory leak
 *     (quy tắc plan B2 mục 5.7).
 *   - Lỗi 4xx (400 thiếu file, 404 scanId lạ) -> ném lên cho UI hiện lỗi thật.
 *     KHÔNG fallback, KHÔNG bịa kết quả scan giả.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useServices } from '../../data/ServiceProvider';

const UPLOAD_BY_TYPE = {
  image: 'scanImage',
  receipt: 'scanReceipt',
  barcode: 'scanBarcode',
};

export const useScanFlow = () => {
  const services = useServices();
  const abortRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle|uploading|polling|error
  const [error, setError] = useState(null);

  // Rời màn giữa chừng -> huỷ poll đang chạy.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Chạy 1 lượt scan hoàn chỉnh: upload rồi poll tới khi xong.
   *
   * @param {'image'|'receipt'|'barcode'} scanType
   * @param {string} uri - URI cục bộ của ảnh
   * @returns {Promise<{scanId:string,scanType:string,items:object[]}|null>}
   *   `null` = user huỷ / rời màn giữa chừng (không phải lỗi, caller bỏ qua).
   */
  const startScan = useCallback(
    async (scanType, uri) => {
      const method = UPLOAD_BY_TYPE[scanType] || 'scanImage';

      // Huỷ lượt scan trước (nếu còn) rồi bắt đầu lượt mới.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setPhase('uploading');

      try {
        const upload = await services.fridgeService[method](uri);
        const scanId = upload?.scanId;
        if (!scanId) {
          throw new Error('Không nhận được mã scan từ máy chủ');
        }
        if (controller.signal.aborted) return null;

        setPhase('polling');
        const result = await services.fridgeService.pollScanResult(scanId, {
          signal: controller.signal,
        });

        setPhase('idle');
        const items = Array.isArray(result?.items) ? result.items : [];
        return {
          scanId: result.scanId,
          scanType: result.scanType,
          // Chuẩn hoá 1 lần ở đây để màn review không phải đoán shape:
          // thêm `storageLocation` mặc định + id ổn định cho `key`.
          items: items.map((it, idx) => ({
            clientId: `${result.scanId}-${idx}`,
            ingredientId: it.ingredientId ?? null,
            name: it.name ?? '',
            quantity: Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 1,
            unit: it.unit ?? '',
            confidence: it.confidence ?? null,
            needsConfirm: it.needsConfirm === true,
            allergyWarning: it.allergyWarning === true,
            storageLocation: 'fridge',
          })),
        };
      } catch (e) {
        // User huỷ / rời màn -> im lặng, không hiện lỗi.
        if (controller.signal.aborted) {
          setPhase('idle');
          return null;
        }
        setError(e);
        setPhase('error');
        throw e;
      }
    },
    [services]
  );

  return { phase, error, startScan, cancel, clearError };
};
