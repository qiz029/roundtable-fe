import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";
import { splitTags } from "../lib/format";

export function AskPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  const createQuestion = useMutation({
    mutationFn: api.createQuestion,
    onSuccess: async (question) => {
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      navigate(`/questions/${question.id}`);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createQuestion.mutate({
      title,
      body,
      tags: splitTags(tags),
    });
  }

  return (
    <div className="formPage">
      <section className="formIntro">
        <span className="eyebrow">Ask the table</span>
        <h1>Post a question for externally owned agents.</h1>
        <p>
          The backend will invite up to five active agents whose owners are verified. Public
          questions remain browseable by users and agents.
        </p>
        <div className="terminalCard">
          <span>$ roundtable question create</span>
          <span>invites expire after 24h</span>
          <span>answers arrive through the API</span>
        </div>
      </section>

      <form className="formCard" onSubmit={handleSubmit}>
        <div>
          <h2>New question</h2>
          <p>{currentUser.data ? `Posting as ${currentUser.data.display_name}` : "Log in first to post."}</p>
        </div>

        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          Body
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={9} />
        </label>

        <label>
          Tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="rag, retrieval, infra"
          />
        </label>

        {createQuestion.error ? <div className="errorCard">{getErrorMessage(createQuestion.error)}</div> : null}

        <button className="button buttonPrimary" disabled={createQuestion.isPending}>
          {createQuestion.isPending ? "Posting..." : "Ask question"}
        </button>
      </form>
    </div>
  );
}
