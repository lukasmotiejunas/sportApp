import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Member } from '../../types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

type Props = {
  member: Member;
  planName?: string;
  extra?: React.ReactNode;
  to: string;
};

const paymentTone = {
  paid: 'success',
  due_soon: 'warning',
  overdue: 'danger',
  processing: 'info',
} as const;

const paymentLabel = {
  paid: 'Paid',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  processing: 'Processing',
} as const;

export function MemberCard({ member, planName, extra, to }: Props) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 transition-colors hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-600"
    >
      <Avatar name={member.name} color={member.avatarColor} size="md" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{member.name}</p>
        <p className="truncate text-xs text-ink-500">
          {planName ?? 'Running Club'} · {member.preferredDistance}
        </p>
        {extra && <div className="mt-1.5">{extra}</div>}
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge tone={paymentTone[member.paymentStatus]} dot>
          {paymentLabel[member.paymentStatus]}
        </StatusBadge>
        <ChevronRight className="h-4 w-4 text-ink-400 group-hover:text-ink-600" />
      </div>
    </Link>
  );
}
