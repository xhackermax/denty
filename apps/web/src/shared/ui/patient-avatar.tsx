import { Avatar } from "@mantine/core";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface PatientAvatarProps {
  name: string;
  size?: number;
  src?: string | null | undefined;
}

export function PatientAvatar({ name, size = 40, src }: PatientAvatarProps) {
  return (
    <Avatar name={name} size={size} color="dentyTeal" {...(src ? { src } : {})}>
      {initials(name)}
    </Avatar>
  );
}
