import { useMemo } from 'react';

const quotes = [
  { content: '专业的服务态度，是赢得客户信任的第一步。', author: '客服准则' },
  { content: '每一次与客户的沟通，都是展示专业素养的机会。', author: '服务理念' },
  { content: '保持积极的工作态度，让每一位客户都感受到温暖。', author: '团队精神' },
  { content: '客户的每一个问题，都是我们提升服务的契机。', author: '服务意识' },
  { content: '专注于解决问题，而不是被负面情绪影响。', author: '职业素养' },
  { content: '用耐心和专业，赢得客户的认可与尊重。', author: '服务宗旨' },
  { content: '团队的成功，来自每一位成员的认真负责。', author: '团队合作' },
  { content: '保持热情，让工作成为一种乐趣。', author: '工作态度' },
  { content: '客户的满意，是我们最大的成就。', author: '服务目标' },
  { content: '服从管理安排，共同创造团队价值。', author: '团队精神' },
  { content: '不因客户的负面情绪，影响自己的工作状态。', author: '职业心态' },
  { content: '专业、高效、热情，是客服的基本素养。', author: '服务标准' },
  { content: '每一次沟通，都是建立信任的桥梁。', author: '服务理念' },
  { content: '保持学习心态，不断提升服务水平。', author: '自我提升' },
  { content: '团队的荣誉，需要每个人的努力与付出。', author: '团队精神' },
];

export default function DailyQuote() {
  const quote = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / 86400000);
    return quotes[dayOfYear % quotes.length];
  }, []);

  return (
    <div className="rounded-xl p-4 border border-[#E8DFD2] bg-white shadow-sm mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💭</span>
        <span className="text-sm font-semibold text-[#4A3A2F]">每日寄语</span>
      </div>
      <p className="text-sm italic text-[#5A4A3F] leading-relaxed mb-1.5">
        &ldquo;{quote.content}&rdquo;
      </p>
      <p className="text-xs text-[#A08F80] text-right">
        —— {quote.author}
      </p>
    </div>
  );
}
