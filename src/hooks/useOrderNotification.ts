import type { Order } from '@/types';

// 播放6秒提示音
export function playNotificationSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const startTime = ctx.currentTime;
    const duration = 6;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';

    const frequencies = [880, 1100, 880, 1100, 880, 1100];
    frequencies.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, startTime + i);
    });

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);

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
    // 静默处理
  }
}

// 比较前后订单列表，检测新订单和状态变化
export function detectOrderChanges(
  prevOrders: Order[],
  currOrders: Order[]
): { newOrders: Order[]; statusChanges: { order: Order; oldStatus: string; newStatus: string }[] } {
  if (prevOrders.length === 0) {
    return { newOrders: [], statusChanges: [] }; // 首次加载，不检测
  }

  const prevMap = new Map(prevOrders.map(o => [o.id, o.status]));
  const newOrders: Order[] = [];
  const statusChanges: { order: Order; oldStatus: string; newStatus: string }[] = [];

  currOrders.forEach(order => {
    const oldStatus = prevMap.get(order.id);
    if (oldStatus === undefined) {
      newOrders.push(order);
    } else if (oldStatus !== order.status) {
      statusChanges.push({ order, oldStatus, newStatus: order.status });
    }
  });

  return { newOrders, statusChanges };
}
