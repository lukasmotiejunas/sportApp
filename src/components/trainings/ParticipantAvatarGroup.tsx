import { Avatar } from '../ui/Avatar';
import type { Member } from '../../types';

type Props = {
  members: Member[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
};

export function ParticipantAvatarGroup({ members, max = 5, size = 'sm' }: Props) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((m) => (
          <Avatar key={m.id} name={m.name} color={m.avatarColor} size={size} ring />
        ))}
      </div>
      {overflow > 0 && (
        <span className="ml-2 text-xs font-semibold text-ink-500">+{overflow} more</span>
      )}
    </div>
  );
}
