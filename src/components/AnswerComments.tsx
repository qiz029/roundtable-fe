import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AnswerComment, PaginatedResult, User } from "../api/types";
import { getErrorMessage } from "../hooks/useAuth";
import { relativeTime } from "../lib/format";
import { ProfileAvatar } from "./ProfileAvatar";

const COMMENT_PAGE_SIZE = 10;
const COMMENT_MAX_LENGTH = 2000;

type AnswerCommentsProps = {
  answerId: string;
  commentCount?: number;
  currentUser?: User;
  onCommentCountChange?: (delta: number) => void;
};

export function AnswerComments({ answerId, commentCount, currentUser, onCommentCountChange }: AnswerCommentsProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<AnswerComment | undefined>();
  const queryClient = useQueryClient();
  const commentsQueryKey = ["answer", answerId, "comments"] as const;

  const commentsQuery = useInfiniteQuery({
    queryKey: commentsQueryKey,
    queryFn: ({ pageParam }) =>
      api.listAnswerComments(answerId, {
        limit: COMMENT_PAGE_SIZE,
        offset: Number(pageParam),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? (lastPage.pagination.next_offset ?? undefined) : undefined,
    enabled: expanded,
  });

  const comments = useMemo(() => commentsQuery.data?.pages.flatMap((page) => page.items) || [], [commentsQuery.data]);
  const visibleCommentCount = commentCount ?? comments.length;
  const trimmedDraft = draft.trim();

  const createComment = useMutation({
    mutationFn: () =>
      api.createAnswerComment(answerId, {
        body: trimmedDraft,
        reply_to_comment_id: replyTarget?.id,
      }),
    onSuccess: (comment) => {
      setDraft("");
      setReplyTarget(undefined);
      onCommentCountChange?.(1);
      queryClient.setQueryData<InfiniteData<PaginatedResult<AnswerComment>>>(commentsQueryKey, (current) =>
        appendComment(current, comment),
      );
    },
  });

  const deleteComment = useMutation({
    mutationFn: (comment: AnswerComment) => api.deleteAnswerComment(comment.id),
    onSuccess: (_, comment) => {
      if (replyTarget?.id === comment.id) {
        setReplyTarget(undefined);
      }
      onCommentCountChange?.(-1);
      queryClient.setQueryData<InfiniteData<PaginatedResult<AnswerComment>>>(commentsQueryKey, (current) =>
        removeComment(current, comment.id),
      );
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !trimmedDraft || createComment.isPending) return;
    createComment.mutate();
  }

  function handleReply(comment: AnswerComment) {
    setReplyTarget(comment);
    setDraft(`@${comment.author.display_name} `);
  }

  return (
    <section className="answerComments" aria-label="Answer comments">
      <button
        aria-expanded={expanded}
        className="commentsToggle"
        type="button"
        onClick={() => setExpanded((current) => !current)}
      >
        <MessageCircle size={14} />
        {commentCountLabel(visibleCommentCount)}
      </button>

      {expanded ? (
        <div className="commentsPanel">
          {commentsQuery.isLoading ? <div className="commentStatus">Loading comments...</div> : null}
          {commentsQuery.error ? <div className="commentError">{getErrorMessage(commentsQuery.error)}</div> : null}
          {!commentsQuery.isLoading && !commentsQuery.error && comments.length === 0 ? (
            <div className="commentStatus">No comments yet.</div>
          ) : null}

          {comments.length > 0 ? (
            <div className="commentList">
              {comments.map((comment) => (
                <CommentItem
                  comment={comment}
                  currentUser={currentUser}
                  deleting={deleteComment.isPending}
                  key={comment.id}
                  onDelete={() => deleteComment.mutate(comment)}
                  onReply={() => handleReply(comment)}
                />
              ))}
            </div>
          ) : null}

          {commentsQuery.hasNextPage ? (
            <button
              className="commentLoadMore"
              disabled={commentsQuery.isFetchingNextPage}
              type="button"
              onClick={() => commentsQuery.fetchNextPage()}
            >
              {commentsQuery.isFetchingNextPage ? "Loading..." : "Load more comments"}
            </button>
          ) : null}

          {currentUser ? (
            <form className="commentComposer" onSubmit={handleSubmit}>
              {replyTarget ? (
                <div className="commentReplyBanner">
                  <span>Replying to @{replyTarget.author.display_name}</span>
                  <button type="button" onClick={() => setReplyTarget(undefined)}>
                    Cancel
                  </button>
                </div>
              ) : null}
              <textarea
                aria-label="Add a comment"
                disabled={createComment.isPending}
                maxLength={COMMENT_MAX_LENGTH}
                placeholder="Add a comment..."
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="commentComposerActions">
                <span>
                  {draft.length}/{COMMENT_MAX_LENGTH}
                </span>
                <button disabled={!trimmedDraft || createComment.isPending} type="submit">
                  <Send size={14} />
                  {createComment.isPending ? "Posting" : "Post"}
                </button>
              </div>
              {createComment.error ? <div className="commentError">{getErrorMessage(createComment.error)}</div> : null}
            </form>
          ) : (
            <div className="commentLoginHint">
              <Link to="/login">Log in to comment</Link>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CommentItem({
  comment,
  currentUser,
  deleting,
  onDelete,
  onReply,
}: {
  comment: AnswerComment;
  currentUser?: User;
  deleting: boolean;
  onDelete: () => void;
  onReply: () => void;
}) {
  const canDelete = currentUser?.id === comment.author.id;

  return (
    <article className="commentItem">
      <ProfileAvatar name={comment.author.display_name} size="sm" url={comment.author.avatar_url} />
      <div className="commentBody">
        <div className="commentMeta">
          <b>{comment.author.display_name}</b>
          <span>{relativeTime(comment.created_at)}</span>
          {comment.reply_to ? <span>replying to @{comment.reply_to.author_display_name}</span> : null}
        </div>
        <p>{comment.body}</p>
        <div className="commentActions">
          {currentUser ? (
            <button className="inlineAction" type="button" onClick={onReply}>
              Reply
            </button>
          ) : null}
          {canDelete ? (
            <button className="commentDeleteButton" disabled={deleting} type="button" onClick={onDelete}>
              <Trash2 size={13} />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function commentCountLabel(count: number) {
  if (count === 1) return "1 comment";
  return `${count} comments`;
}

function appendComment(current: InfiniteData<PaginatedResult<AnswerComment>> | undefined, comment: AnswerComment) {
  if (!current || current.pages.length === 0) {
    return {
      pageParams: [0],
      pages: [
        {
          items: [comment],
          pagination: {
            has_more: false,
            limit: COMMENT_PAGE_SIZE,
            next_offset: null,
            offset: 0,
          },
        },
      ],
    };
  }

  const pages = current.pages.map((page) => ({
    ...page,
    items: page.items.filter((item) => item.id !== comment.id),
  }));
  const lastPageIndex = pages.length - 1;
  pages[lastPageIndex] = {
    ...pages[lastPageIndex],
    items: [...pages[lastPageIndex].items, comment],
  };

  return {
    ...current,
    pages,
  };
}

function removeComment(current: InfiniteData<PaginatedResult<AnswerComment>> | undefined, commentId: string) {
  if (!current) return current;

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== commentId),
    })),
  };
}
