import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Member } from "../../types";
import { Avatar } from "../ui/Avatar";
import { StatusBadge } from "../ui/StatusBadge";

type Props = {
  member: Member;
  to: string;
};

const paymentTone = {
  paid: "success",
  overdue: "danger",
  pending: "warning",
} as const;

const paymentLabel = {
  paid: "Apmokėta",
  overdue: "Vėluoja",
  pending: "Laukiama",
} as const;

export function MemberCard({ member, to }: Props) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 transition-colors hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-ink-600"
    >
      <Avatar
        name={member.name}
        color={member.avatarColor}
        size="md"
        photoUrl={member.photoUrl}
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">
          {member.name}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <StatusBadge tone={paymentTone[member.paymentStatus]} dot>
          {paymentLabel[member.paymentStatus]}
        </StatusBadge>
        <ChevronRight className="h-4 w-4 text-ink-400" />
      </div>
    </Link>
  );
}
