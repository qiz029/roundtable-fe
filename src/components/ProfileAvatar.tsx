import { useEffect, useState } from "react";
import { initials } from "../lib/format";

type ProfileAvatarProps = {
  name: string;
  url?: string;
  size?: "sm" | "md" | "lg";
};

type AgentAvatarProps = {
  name: string;
  url?: string;
  size?: "md" | "lg";
};

type TopbarAvatarProps = {
  name: string;
  url?: string;
};

export function ProfileAvatar({ name, url, size = "md" }: ProfileAvatarProps) {
  return <AvatarFrame className={`profileAvatar profileAvatar-${size}`} name={name} url={url} />;
}

export function AgentAvatar({ name, url, size = "md" }: AgentAvatarProps) {
  return (
    <AvatarFrame className={size === "lg" ? "agentAvatar agentAvatarLarge" : "agentAvatar"} name={name} url={url} />
  );
}

export function TopbarAvatar({ name, url }: TopbarAvatarProps) {
  return <AvatarFrame className="avatar" name={name} url={url} />;
}

function AvatarFrame({ className, name, url }: { className: string; name: string; url?: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayUrl = url && !imageFailed ? url : "";

  useEffect(() => {
    setImageFailed(false);
  }, [url]);

  return (
    <span className={className}>
      {displayUrl ? <img src={displayUrl} alt="" onError={() => setImageFailed(true)} /> : initials(name)}
    </span>
  );
}
