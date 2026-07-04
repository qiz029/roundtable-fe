import { initials } from "../lib/format";

type ProfileAvatarProps = {
  name: string;
  url?: string;
  size?: "sm" | "md" | "lg";
};

export function ProfileAvatar({ name, url, size = "md" }: ProfileAvatarProps) {
  return (
    <span className={`profileAvatar profileAvatar-${size}`}>
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}
