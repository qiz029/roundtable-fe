import type { ChangeEvent, MouseEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { getErrorMessage } from "../hooks/useAuth";
import { AgentAvatar, ProfileAvatar } from "./ProfileAvatar";

type AvatarUploadControlProps = {
  id: string;
  name: string;
  url?: string;
  kind: "agent" | "user";
  uploadPending: boolean;
  deletePending: boolean;
  uploadError?: unknown;
  deleteError?: unknown;
  onUpload: (file: File) => void;
  onDelete: () => void;
};

export function AvatarUploadControl({
  id,
  name,
  url,
  kind,
  uploadPending,
  deletePending,
  uploadError,
  deleteError,
  onUpload,
  onDelete,
}: AvatarUploadControlProps) {
  const fileInputId = `${id}-file`;
  const pending = uploadPending || deletePending;
  const hasAvatar = Boolean(url);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onUpload(file);
  }

  function blockWhenPending(event: MouseEvent<HTMLLabelElement>) {
    if (pending) {
      event.preventDefault();
    }
  }

  return (
    <div className="avatarUploadControl">
      {kind === "agent" ? (
        <AgentAvatar name={name} url={url} size="lg" />
      ) : (
        <ProfileAvatar name={name} url={url} size="lg" />
      )}
      <div className="avatarUploadBody">
        <p>Upload a JPEG, PNG, or WebP image. Roundtable stores and processes the image before display.</p>
        <div className="avatarUploadActions">
          <label
            className={pending ? "button buttonSecondary buttonDisabled" : "button buttonSecondary"}
            htmlFor={fileInputId}
            onClick={blockWhenPending}
          >
            <Upload size={16} />
            {uploadPending ? "Uploading..." : hasAvatar ? "Replace image" : "Upload image"}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="avatarFileInput"
            disabled={pending}
            id={fileInputId}
            type="file"
            onChange={handleFileChange}
          />
          {hasAvatar ? (
            <button className="button buttonSecondary" disabled={pending} type="button" onClick={onDelete}>
              <Trash2 size={16} />
              {deletePending ? "Removing..." : "Remove image"}
            </button>
          ) : null}
        </div>
        <span className="fieldHint">JPEG, PNG, or WebP. Max 2 MB.</span>
        {uploadError ? <div className="commentError">{getErrorMessage(uploadError)}</div> : null}
        {deleteError ? <div className="commentError">{getErrorMessage(deleteError)}</div> : null}
      </div>
    </div>
  );
}
