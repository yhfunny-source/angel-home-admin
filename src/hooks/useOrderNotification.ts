import { useEffect, useRef } from 'react';
import type { Order } from '@/types';

// 播放6秒提示音
function playNotificationSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const startTime = ctx.currentTime;
    const duration = 6; // 6秒

    // 主振荡器 - 交替高低音
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    // 6秒内交替频率
    const frequencies = [880, 1100, 880, 1100, 880, 1100];
    frequencies.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, startTime + i);
    });

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // 第二个振荡器增加层次感
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(660, startTime);
    osc2.frequency.setValueAtTime(1320, startTime + 2);
    osc2.frequency.setValueAtTime(660, startTime + 4);

    gain2.gain.setValueAtTime(0.15, startTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc2.start(startTime);
    osc2.stop(startTime + duration);
  } catch {
    // 音频播放失败静默处理
  }
}

export function useOrderNotification(
  orders: Order[],
  onStatusChange: (order: Order, oldStatus: string, newStatus: string) => void
) {
  const prevOrdersRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const prevMap = prevOrdersRef.current;
    const newMap = new Map<string, string>();

    orders.forEach(o => {
      newMap.set(o.id, o.status);
      const oldStatus = prevMap.get(o.id);
      if (oldStatus && oldStatus !== o.status) {
        // 状态变化！
        playNotificationSound();
        onStatusChange(o, oldStatus, o.status);
      }
    });

    prevOrdersRef.current = newMap;
  }, [orders, onStatusChange]);
}
